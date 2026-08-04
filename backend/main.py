from typing import Optional

from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime

import auth
import email_utils
import models
import schemas
import utils
from database import engine, get_db

# Create database tables (creates devgym.db on first run)
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="ErNord API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_current_user(authorization: str = Header(None), db: Session = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")

    token = authorization.split(" ", 1)[1]
    payload = auth.decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user = db.query(models.User).filter(models.User.id == payload.get("sub")).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user


@app.get("/")
def read_root():
    return {"message": "ErNord API is running"}


# ---------- Users ----------

@app.post("/users", response_model=schemas.UserOut)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == user.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="This email is already registered")

    new_user = models.User(
        email=user.email,
        password_hash=auth.hash_password(user.password),
        full_name=user.full_name,
        bio=user.bio,
        skills=user.skills,
        experience_level=utils.calculate_experience_level(user.years_of_experience),
        github_username=user.github_username,
        availability=user.availability,
        years_of_experience=user.years_of_experience,
        languages=user.languages,
        preferred_title=user.preferred_title,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@app.get("/users", response_model=list[schemas.UserOut])
def list_users(db: Session = Depends(get_db)):
    return db.query(models.User).all()


@app.get("/users/search")
def search_users(
    skills: Optional[str] = None,
    min_years_experience: Optional[int] = None,
    languages: Optional[str] = None,
    title: Optional[str] = None,
    experience_level: Optional[models.ExperienceLevel] = None,
    db: Session = Depends(get_db),
):
    query = db.query(models.User)

    if min_years_experience is not None:
        query = query.filter(models.User.years_of_experience >= min_years_experience)
    if title:
        query = query.filter(models.User.preferred_title.ilike(title))
    if experience_level:
        query = query.filter(models.User.experience_level == experience_level)

    users = query.all()

    if skills:
        wanted_skills = [s.strip().lower() for s in skills.split(",") if s.strip()]
        users = [
            u for u in users
            if any(w in s.lower() for s in (u.skills or []) for w in wanted_skills)
        ]

    if languages:
        wanted_languages = [l.strip().lower() for l in languages.split(",") if l.strip()]
        users = [
            u for u in users
            if any(w in lang.lower() for lang in (u.languages or []) for w in wanted_languages)
        ]

    def summarize(bio):
        if not bio:
            return None
        return bio if len(bio) <= 160 else bio[:157].rstrip() + "..."

    result = []
    for u in users:
        feedback = db.query(models.Feedback).filter(models.Feedback.to_user_id == u.id).all()
        feedback_count = len(feedback)
        if feedback_count:
            avg_communication = round(sum(f.communication for f in feedback) / feedback_count, 1)
            avg_reliability = round(sum(f.reliability for f in feedback) / feedback_count, 1)
            avg_code_quality = round(sum(f.code_quality for f in feedback) / feedback_count, 1)
            avg_overall = round((avg_communication + avg_reliability + avg_code_quality) / 3, 1)
        else:
            avg_communication = avg_reliability = avg_code_quality = avg_overall = None

        result.append({
            "id": u.id,
            "full_name": u.full_name,
            "bio": summarize(u.bio),
            "skills": u.skills,
            "years_of_experience": u.years_of_experience,
            "languages": u.languages,
            "preferred_title": u.preferred_title,
            "experience_level": u.experience_level,
            "reputation": {
                "feedback_count": feedback_count,
                "avg_communication": avg_communication,
                "avg_reliability": avg_reliability,
                "avg_code_quality": avg_code_quality,
                "avg_overall": avg_overall,
            },
        })

    # Highest-rated first; anyone with no feedback yet sorts to the end.
    result.sort(key=lambda r: (r["reputation"]["avg_overall"] is None, -(r["reputation"]["avg_overall"] or 0)))

    return result


@app.get("/users/{user_id}/profile")
def get_user_profile(user_id: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    owned_projects = db.query(models.Project).filter(models.Project.owner_id == user_id).all()

    memberships = db.query(models.TeamMember).filter(models.TeamMember.user_id == user_id).all()
    joined_project_ids = [m.project_id for m in memberships]
    joined_projects = db.query(models.Project).filter(models.Project.id.in_(joined_project_ids)).all()

    joined_total_count = len(joined_projects)
    joined_completed_count = sum(1 for p in joined_projects if p.status == models.ProjectStatus.completed)
    completion_rate = round(joined_completed_count / joined_total_count * 100) if joined_total_count else None

    received_feedback = db.query(models.Feedback).filter(models.Feedback.to_user_id == user_id).all()
    feedback_count = len(received_feedback)

    def avg(values):
        return round(sum(values) / len(values), 1) if values else None

    reputation = {
        "feedback_count": feedback_count,
        "avg_communication": avg([f.communication for f in received_feedback]),
        "avg_reliability": avg([f.reliability for f in received_feedback]),
        "avg_code_quality": avg([f.code_quality for f in received_feedback]),
        "avg_overall": avg([(f.communication + f.reliability + f.code_quality) / 3 for f in received_feedback]),
    }

    # Per-project average, so each joined-project card can show how this user was
    # rated specifically on that project (None when nobody has rated them there yet).
    feedback_by_project = {}
    for f in received_feedback:
        feedback_by_project.setdefault(f.project_id, []).append(f)

    def project_avg_rating(project_id):
        items = feedback_by_project.get(project_id)
        if not items:
            return None
        return avg([(f.communication + f.reliability + f.code_quality) / 3 for f in items])

    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "bio": user.bio,
        "skills": user.skills,
        "experience_level": user.experience_level,
        "github_username": user.github_username,
        "availability": user.availability,
        "plan": user.plan,
        "owned_projects": [
            {"id": p.id, "title": p.title, "status": p.status} for p in owned_projects
        ],
        "joined_projects": [
            {"id": p.id, "title": p.title, "status": p.status, "avg_rating": project_avg_rating(p.id)}
            for p in joined_projects
        ],
        "joined_total_count": joined_total_count,
        "joined_completed_count": joined_completed_count,
        "completion_rate": completion_rate,
        "reputation": reputation,
    }


@app.put("/users/{user_id}", response_model=schemas.UserOut)
def update_user(
    user_id: str,
    updates: schemas.UserUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only update your own profile")

    update_data = updates.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(current_user, field, value)

    # experience_level is derived, never set directly — keep it in sync whenever
    # years_of_experience changes (and re-derive unconditionally otherwise too,
    # which is a no-op but keeps this self-healing against any stale stored value).
    current_user.experience_level = utils.calculate_experience_level(current_user.years_of_experience)

    db.commit()
    db.refresh(current_user)
    return current_user


@app.get("/users/{user_id}/activity")
def get_user_activity(user_id: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    dates = []

    projects = db.query(models.Project).filter(models.Project.owner_id == user_id).all()
    dates += [p.created_at.date().isoformat() for p in projects]

    applications = db.query(models.Application).filter(models.Application.user_id == user_id).all()
    dates += [a.applied_at.date().isoformat() for a in applications]

    memberships = db.query(models.TeamMember).filter(models.TeamMember.user_id == user_id).all()
    dates += [m.joined_at.date().isoformat() for m in memberships]

    counts = {}
    for d in dates:
        counts[d] = counts.get(d, 0) + 1

    return counts


# ---------- Work Experience ----------

@app.post("/users/{user_id}/work-experience", response_model=schemas.WorkExperienceOut)
def create_work_experience(user_id: str, experience: schemas.WorkExperienceCreate, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    new_experience = models.WorkExperience(
        user_id=user_id,
        company=experience.company,
        role=experience.role,
        start_date=experience.start_date,
        end_date=experience.end_date,
        description=experience.description,
    )
    db.add(new_experience)
    db.commit()
    db.refresh(new_experience)
    return new_experience


@app.get("/users/{user_id}/work-experience", response_model=list[schemas.WorkExperienceOut])
def list_work_experience(user_id: str, db: Session = Depends(get_db)):
    return db.query(models.WorkExperience).filter(models.WorkExperience.user_id == user_id).all()


@app.delete("/work-experience/{experience_id}")
def delete_work_experience(experience_id: str, db: Session = Depends(get_db)):
    experience = db.query(models.WorkExperience).filter(models.WorkExperience.id == experience_id).first()
    if not experience:
        raise HTTPException(status_code=404, detail="Work experience not found")

    db.delete(experience)
    db.commit()
    return {"ok": True}


# ---------- Education ----------

@app.post("/users/{user_id}/education", response_model=schemas.EducationOut)
def create_education(user_id: str, education: schemas.EducationCreate, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    new_education = models.Education(
        user_id=user_id,
        school=education.school,
        degree=education.degree,
        start_date=education.start_date,
        end_date=education.end_date,
        description=education.description,
    )
    db.add(new_education)
    db.commit()
    db.refresh(new_education)
    return new_education


@app.get("/users/{user_id}/education", response_model=list[schemas.EducationOut])
def list_education(user_id: str, db: Session = Depends(get_db)):
    return db.query(models.Education).filter(models.Education.user_id == user_id).all()


@app.delete("/education/{education_id}")
def delete_education(education_id: str, db: Session = Depends(get_db)):
    education = db.query(models.Education).filter(models.Education.id == education_id).first()
    if not education:
        raise HTTPException(status_code=404, detail="Education not found")

    db.delete(education)
    db.commit()
    return {"ok": True}


# ---------- Projects ----------

def calculate_project_health(project: models.Project, db: Session) -> str:
    """Classify a project's momentum from its most recent activity: a newly opened
    position, a newly submitted application, or a newly joined team member — whichever
    is most recent. Falls back to the project's own creation date if none of those exist
    yet, so a freshly published project reads as "active" rather than "stale"."""
    position_ids = [
        row[0] for row in db.query(models.Position.id).filter(models.Position.project_id == project.id).all()
    ]

    last_activity = project.created_at

    latest_position = (
        db.query(models.Position.created_at)
        .filter(models.Position.project_id == project.id)
        .order_by(models.Position.created_at.desc())
        .first()
    )
    if latest_position and latest_position[0] > last_activity:
        last_activity = latest_position[0]

    if position_ids:
        latest_application = (
            db.query(models.Application.applied_at)
            .filter(models.Application.position_id.in_(position_ids))
            .order_by(models.Application.applied_at.desc())
            .first()
        )
        if latest_application and latest_application[0] > last_activity:
            last_activity = latest_application[0]

    latest_team_join = (
        db.query(models.TeamMember.joined_at)
        .filter(models.TeamMember.project_id == project.id)
        .order_by(models.TeamMember.joined_at.desc())
        .first()
    )
    if latest_team_join and latest_team_join[0] > last_activity:
        last_activity = latest_team_join[0]

    days_since = (datetime.utcnow() - last_activity).days

    if days_since < 7:
        return "active"
    if days_since <= 21:
        return "slow"
    return "stale"


@app.post("/projects", response_model=schemas.ProjectOut)
def create_project(
    project: schemas.ProjectCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    new_project = models.Project(
        owner_id=current_user.id,
        title=project.title,
        description=project.description,
        tech_stack=project.tech_stack,
        github_repo_url=project.github_repo_url,
        project_type=project.project_type,
        duration_weeks=project.duration_weeks,
        weekly_hours=project.weekly_hours,
        timezone=project.timezone,
    )
    db.add(new_project)
    db.commit()
    db.refresh(new_project)
    return new_project


@app.get("/projects", response_model=list[schemas.ProjectOut])
def list_projects(
    role: Optional[str] = None,
    tech: Optional[str] = None,
    project_type: Optional[models.ProjectType] = None,
    duration_weeks: Optional[int] = None,
    weekly_hours: Optional[int] = None,
    has_open_position: bool = True,
    db: Session = Depends(get_db),
):
    query = db.query(models.Project)

    if project_type:
        query = query.filter(models.Project.project_type == project_type)
    if duration_weeks is not None:
        query = query.filter(models.Project.duration_weeks <= duration_weeks)
    if weekly_hours is not None:
        query = query.filter(models.Project.weekly_hours <= weekly_hours)

    if role or has_open_position:
        position_filters = []
        if has_open_position:
            position_filters.append(models.Position.status == models.PositionStatus.open)
        if role:
            position_filters.append(models.Position.role_name.ilike(f"%{role}%"))

        matching_project_ids = [
            row[0] for row in db.query(models.Position.project_id).filter(*position_filters).distinct().all()
        ]
        query = query.filter(models.Project.id.in_(matching_project_ids))

    projects = query.all()

    if tech:
        tech_lower = tech.lower()
        projects = [p for p in projects if any(tech_lower in t.lower() for t in (p.tech_stack or []))]

    for p in projects:
        p.health = calculate_project_health(p, db)

    return projects


@app.get("/projects/{project_id}", response_model=schemas.ProjectOut)
def get_project(project_id: str, db: Session = Depends(get_db)):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    project.health = calculate_project_health(project, db)
    return project


@app.put("/projects/{project_id}", response_model=schemas.ProjectOut)
def update_project(
    project_id: str,
    updates: schemas.ProjectUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the project owner can update this project")

    update_data = updates.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(project, field, value)

    db.commit()
    db.refresh(project)
    return project


@app.delete("/projects/{project_id}")
def delete_project(
    project_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the project owner can delete this project")

    position_ids = [
        p.id for p in db.query(models.Position).filter(models.Position.project_id == project_id).all()
    ]

    db.query(models.Application).filter(models.Application.position_id.in_(position_ids)).delete(synchronize_session=False)
    db.query(models.TeamMember).filter(models.TeamMember.project_id == project_id).delete(synchronize_session=False)
    db.query(models.Position).filter(models.Position.project_id == project_id).delete(synchronize_session=False)
    db.query(models.ProjectComment).filter(models.ProjectComment.project_id == project_id).delete(synchronize_session=False)
    db.query(models.Feedback).filter(models.Feedback.project_id == project_id).delete(synchronize_session=False)
    db.delete(project)
    db.commit()
    return {"ok": True}


@app.put("/projects/{project_id}/complete", response_model=schemas.ProjectOut)
def complete_project(
    project_id: str,
    payload: Optional[schemas.ProjectCompleteRequest] = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the project owner can mark this project as completed")

    project.status = models.ProjectStatus.completed
    if payload and payload.summary:
        project.completion_summary = payload.summary

    db.commit()
    db.refresh(project)
    return project


# ---------- Positions ----------

@app.post("/projects/{project_id}/positions", response_model=schemas.PositionOut)
def create_position(project_id: str, position: schemas.PositionCreate, db: Session = Depends(get_db)):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    new_position = models.Position(
        project_id=project_id,
        role_name=position.role_name,
        description=position.description,
    )
    db.add(new_position)
    db.commit()
    db.refresh(new_position)
    return new_position


@app.get("/projects/{project_id}/positions", response_model=list[schemas.PositionOut])
def list_positions(project_id: str, db: Session = Depends(get_db)):
    return db.query(models.Position).filter(models.Position.project_id == project_id).all()


@app.delete("/projects/{project_id}/positions/{position_id}")
def delete_position(
    project_id: str,
    position_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    position = db.query(models.Position).filter(
        models.Position.id == position_id,
        models.Position.project_id == project_id,
    ).first()
    if not position:
        raise HTTPException(status_code=404, detail="Position not found")

    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project or project.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the project owner can delete positions")

    db.query(models.Application).filter(models.Application.position_id == position_id).delete(synchronize_session=False)
    db.delete(position)
    db.commit()
    return {"ok": True}


@app.get("/projects/{project_id}/applications")
def get_project_applications(project_id: str, db: Session = Depends(get_db)):
    positions = db.query(models.Position).filter(models.Position.project_id == project_id).all()
    position_ids = [p.id for p in positions]
    position_map = {p.id: p.role_name for p in positions}

    applications = db.query(models.Application).filter(models.Application.position_id.in_(position_ids)).all()

    result = []
    for app_row in applications:
        applicant = db.query(models.User).filter(models.User.id == app_row.user_id).first()
        result.append({
            "id": app_row.id,
            "position_id": app_row.position_id,
            "role_name": position_map.get(app_row.position_id),
            "user_id": app_row.user_id,
            "applicant_name": applicant.full_name if applicant else None,
            "applicant_email": applicant.email if applicant else None,
            "status": app_row.status,
            "applied_at": app_row.applied_at,
        })
    return result


# ---------- Applications ----------

@app.post("/applications", response_model=schemas.ApplicationOut)
def create_application(
    application: schemas.ApplicationCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    position = db.query(models.Position).filter(models.Position.id == application.position_id).first()
    if not position:
        raise HTTPException(status_code=404, detail="Position not found")
    if position.status != models.PositionStatus.open:
        raise HTTPException(status_code=400, detail="This position is currently filled")

    new_application = models.Application(
        position_id=application.position_id,
        user_id=current_user.id,
    )
    db.add(new_application)
    db.commit()
    db.refresh(new_application)
    return new_application


@app.get("/applications", response_model=list[schemas.ApplicationOut])
def list_applications(db: Session = Depends(get_db)):
    return db.query(models.Application).all()


@app.post("/applications/{application_id}/accept", response_model=schemas.ApplicationOut)
def accept_application(
    application_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    application = db.query(models.Application).filter(models.Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    position = db.query(models.Position).filter(models.Position.id == application.position_id).first()
    project = db.query(models.Project).filter(models.Project.id == position.project_id).first()
    if not project or project.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the project owner can accept applications")

    if position.status != models.PositionStatus.open:
        raise HTTPException(status_code=400, detail="This position is no longer open")

    application.status = models.ApplicationStatus.accepted

    new_member = models.TeamMember(
        project_id=position.project_id,
        user_id=application.user_id,
        position_id=position.id,
    )
    db.add(new_member)

    # Once every position on a project is filled, it has no more open positions, so it
    # stops matching GET /projects' default has_open_position=true filter and drops out
    # of Discover — even though project.status stays "active" until the owner completes it.
    position.status = models.PositionStatus.filled

    db.commit()
    db.refresh(application)
    return application


@app.post("/applications/{application_id}/reject", response_model=schemas.ApplicationOut)
def reject_application(
    application_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    application = db.query(models.Application).filter(models.Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    position = db.query(models.Position).filter(models.Position.id == application.position_id).first()
    project = db.query(models.Project).filter(models.Project.id == position.project_id).first()
    if not project or project.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the project owner can reject applications")

    application.status = models.ApplicationStatus.rejected
    db.commit()
    db.refresh(application)
    return application


# ---------- Team Members ----------

@app.get("/projects/{project_id}/team", response_model=list[schemas.TeamMemberOut])
def list_team_members(project_id: str, db: Session = Depends(get_db)):
    return db.query(models.TeamMember).filter(models.TeamMember.project_id == project_id).all()


@app.post("/team_members/{member_id}/leave", response_model=schemas.TeamMemberOut)
def leave_team(
    member_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    member = db.query(models.TeamMember).filter(models.TeamMember.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Team membership not found")
    if member.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only leave your own team membership")
    if member.left_at is not None:
        raise HTTPException(status_code=400, detail="This member has already left")

    member.left_at = datetime.utcnow()

    position = db.query(models.Position).filter(models.Position.id == member.position_id).first()
    position.status = models.PositionStatus.open  # handoff mechanic triggers here

    db.commit()
    db.refresh(member)
    return member


# ---------- Project Comments ----------

@app.post("/projects/{project_id}/comments", response_model=schemas.ProjectCommentOut)
def create_project_comment(
    project_id: str,
    comment: schemas.ProjectCommentCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    new_comment = models.ProjectComment(
        project_id=project_id,
        user_id=current_user.id,
        content=comment.content,
    )
    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)

    return {
        "id": new_comment.id,
        "project_id": new_comment.project_id,
        "user_id": new_comment.user_id,
        "content": new_comment.content,
        "created_at": new_comment.created_at,
        "author_name": current_user.full_name or current_user.email,
    }


@app.get("/projects/{project_id}/comments", response_model=list[schemas.ProjectCommentOut])
def list_project_comments(project_id: str, db: Session = Depends(get_db)):
    comments = (
        db.query(models.ProjectComment)
        .filter(models.ProjectComment.project_id == project_id)
        .order_by(models.ProjectComment.created_at.asc())
        .all()
    )

    result = []
    for c in comments:
        author = db.query(models.User).filter(models.User.id == c.user_id).first()
        result.append({
            "id": c.id,
            "project_id": c.project_id,
            "user_id": c.user_id,
            "content": c.content,
            "created_at": c.created_at,
            "author_name": (author.full_name or author.email) if author else None,
        })
    return result


# ---------- Feedback ----------

@app.post("/projects/{project_id}/feedback", response_model=schemas.FeedbackOut)
def create_feedback(
    project_id: str,
    feedback: schemas.FeedbackCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.status != models.ProjectStatus.completed:
        raise HTTPException(status_code=400, detail="You can only leave feedback on completed projects")

    if feedback.to_user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You can't leave feedback for yourself")

    from_membership = db.query(models.TeamMember).filter(
        models.TeamMember.project_id == project_id,
        models.TeamMember.user_id == current_user.id,
    ).first()
    if not from_membership:
        raise HTTPException(status_code=403, detail="You must have been a member of this project to leave feedback")

    to_membership = db.query(models.TeamMember).filter(
        models.TeamMember.project_id == project_id,
        models.TeamMember.user_id == feedback.to_user_id,
    ).first()
    if not to_membership:
        raise HTTPException(status_code=404, detail="This user was not a member of this project")

    existing = db.query(models.Feedback).filter(
        models.Feedback.project_id == project_id,
        models.Feedback.from_user_id == current_user.id,
        models.Feedback.to_user_id == feedback.to_user_id,
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="You have already left feedback for this teammate on this project")

    new_feedback = models.Feedback(
        project_id=project_id,
        from_user_id=current_user.id,
        to_user_id=feedback.to_user_id,
        communication=feedback.communication,
        reliability=feedback.reliability,
        code_quality=feedback.code_quality,
        comment=feedback.comment,
    )
    db.add(new_feedback)
    db.commit()
    db.refresh(new_feedback)
    return new_feedback


@app.get("/users/{user_id}/feedback")
def get_user_feedback(user_id: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    feedback_list = (
        db.query(models.Feedback)
        .filter(models.Feedback.to_user_id == user_id)
        .order_by(models.Feedback.created_at.desc())
        .all()
    )

    result = []
    for f in feedback_list:
        project = db.query(models.Project).filter(models.Project.id == f.project_id).first()
        from_user = db.query(models.User).filter(models.User.id == f.from_user_id).first()
        result.append({
            "id": f.id,
            "project_id": f.project_id,
            "project_title": project.title if project else None,
            "from_user_id": f.from_user_id,
            "from_user_name": (from_user.full_name or from_user.email) if from_user else None,
            "communication": f.communication,
            "reliability": f.reliability,
            "code_quality": f.code_quality,
            "comment": f.comment,
            "created_at": f.created_at,
        })

    count = len(feedback_list)

    def avg(values):
        return round(sum(values) / len(values), 1) if values else None

    return {
        "feedback": result,
        "count": count,
        "averages": {
            "communication": avg([f.communication for f in feedback_list]),
            "reliability": avg([f.reliability for f in feedback_list]),
            "code_quality": avg([f.code_quality for f in feedback_list]),
        },
    }


@app.get("/projects/{project_id}/pending-feedback")
def get_pending_feedback(
    project_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.status != models.ProjectStatus.completed:
        return []

    is_member = db.query(models.TeamMember).filter(
        models.TeamMember.project_id == project_id,
        models.TeamMember.user_id == current_user.id,
    ).first()
    if not is_member:
        return []

    teammates = db.query(models.TeamMember).filter(
        models.TeamMember.project_id == project_id,
        models.TeamMember.user_id != current_user.id,
    ).all()
    teammate_user_ids = {m.user_id for m in teammates}

    already_rated = {
        f.to_user_id
        for f in db.query(models.Feedback).filter(
            models.Feedback.project_id == project_id,
            models.Feedback.from_user_id == current_user.id,
        ).all()
    }

    pending_ids = teammate_user_ids - already_rated
    pending_users = db.query(models.User).filter(models.User.id.in_(pending_ids)).all()

    return [
        {"id": u.id, "full_name": u.full_name, "email": u.email}
        for u in pending_users
    ]


# ---------- Auth ----------

@app.post("/login")
def login(email: str, password: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user or not auth.verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    token = auth.create_access_token(data={"sub": user.id})
    return {"access_token": token, "token_type": "bearer", "user_id": user.id}


@app.post("/forgot-password")
def forgot_password(payload: schemas.ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()

    # Always return the same message whether or not the email is registered,
    # so this endpoint can't be used to enumerate accounts.
    if user:
        token = auth.create_password_reset_token(user.id)
        try:
            email_utils.send_password_reset_email(user.email, token)
        except Exception as exc:
            print(f"[forgot-password] Failed to send reset email to {user.email}: {exc}")

    return {"message": "If this email is registered, a password reset link has been sent."}


@app.post("/reset-password")
def reset_password(payload: schemas.ResetPasswordRequest, db: Session = Depends(get_db)):
    user_id = auth.verify_password_reset_token(payload.token)
    if not user_id:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    user.password_hash = auth.hash_password(payload.new_password)
    db.commit()
    return {"message": "Password has been reset successfully"}