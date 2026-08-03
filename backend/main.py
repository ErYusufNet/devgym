from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime

import auth
import models
import schemas
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
        experience_level=user.experience_level,
        github_username=user.github_username,
        availability=user.availability,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@app.get("/users", response_model=list[schemas.UserOut])
def list_users(db: Session = Depends(get_db)):
    return db.query(models.User).all()


@app.get("/users/{user_id}/profile")
def get_user_profile(user_id: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    owned_projects = db.query(models.Project).filter(models.Project.owner_id == user_id).all()

    memberships = db.query(models.TeamMember).filter(models.TeamMember.user_id == user_id).all()
    joined_project_ids = [m.project_id for m in memberships]
    joined_projects = db.query(models.Project).filter(models.Project.id.in_(joined_project_ids)).all()

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
            {"id": p.id, "title": p.title, "status": p.status} for p in joined_projects
        ],
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
def list_projects(db: Session = Depends(get_db)):
    return db.query(models.Project).all()


@app.get("/projects/{project_id}", response_model=schemas.ProjectOut)
def get_project(project_id: str, db: Session = Depends(get_db)):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
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
    db.delete(project)
    db.commit()
    return {"ok": True}


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


# ---------- Auth ----------

@app.post("/login")
def login(email: str, password: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user or not auth.verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    token = auth.create_access_token(data={"sub": user.id})
    return {"access_token": token, "token_type": "bearer", "user_id": user.id}