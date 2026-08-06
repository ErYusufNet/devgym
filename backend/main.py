import difflib
import secrets
from typing import Optional

from fastapi import FastAPI, Depends, HTTPException, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import or_
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

import auth
import discord_utils
import email_utils
import github_utils
import models
import schemas
import utils
from database import engine, get_db

# Create database tables (creates devgym.db on first run)
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="ErNord API")

# Per-IP rate limiting for the auth-adjacent endpoints most exposed to brute-force /
# spam abuse (login, registration, password reset) — see SECURITY_AUDIT.md finding #5.
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://devgym-five.vercel.app",
        "https://ernord.fi",
        "https://www.ernord.fi",
    ],
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


# Simple, hardcoded gate for the one admin action this MVP has (approving recruiter
# accounts). Matches email_utils.CONTACT_INBOX, the site's own admin address. Should
# become a real admin-role check before this app has more than one admin action.
ADMIN_EMAIL = "ernordbusiness@hotmail.com"


def require_approved_recruiter(current_user: models.User) -> None:
    """Shared gate for recruiter-only features (talent search, contact requests).
    Raises 403 unless the caller is a recruiter account that's been manually approved
    — the admin account is always let through too, for platform oversight."""
    if current_user.email == ADMIN_EMAIL:
        return
    if current_user.account_type != models.AccountType.recruiter or not current_user.recruiter_approved:
        raise HTTPException(
            status_code=403,
            detail="This feature is only available to approved recruiter accounts.",
        )


def require_admin(current_user: models.User = Depends(get_current_user)) -> models.User:
    """FastAPI dependency gating every /admin/* route. Single hardcoded email for
    now — if this ever needs more than one admin, swap the check for an `is_admin`
    boolean column on User instead of growing a list of emails here."""
    if current_user.email != ADMIN_EMAIL:
        raise HTTPException(status_code=403, detail="Not authorized")
    return current_user


@app.get("/")
def read_root():
    return {"message": "ErNord API is running"}


@app.get("/stats")
def get_platform_stats(db: Session = Depends(get_db)):
    """Public, aggregate-only counts for landing page stats. No auth needed and no
    per-record data returned — unlike the removed GET /users (see SECURITY_AUDIT.md
    finding #7), this can't be used to enumerate accounts or projects."""
    return {
        "developers": db.query(models.User).count(),
        "projects": db.query(models.Project).count(),
    }


# ---------- Users ----------

@app.post("/users", response_model=schemas.UserOut)
@limiter.limit("5/hour")
def create_user(request: Request, user: schemas.UserCreate, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == user.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="This email is already registered")

    account_type = user.account_type or models.AccountType.developer
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
        account_type=account_type,
        # Recruiter accounts always start unapproved regardless of what's passed in —
        # there's no client-settable field for this, but staying explicit here means
        # a recruiter signup never accidentally gets search access before manual review.
        recruiter_approved=False,
        company_name=user.company_name if account_type == models.AccountType.recruiter else None,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@app.get("/users/search")
def search_users(
    skills: Optional[str] = None,
    min_years_experience: Optional[int] = None,
    languages: Optional[str] = None,
    title: Optional[str] = None,
    experience_level: Optional[models.ExperienceLevel] = None,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_approved_recruiter(current_user)

    # Find Talent searches for developers specifically — without this, recruiter and
    # admin accounts (which also default to visible_to_recruiters=True) would show up
    # alongside actual candidates. The admin account additionally sees everyone,
    # including developers who opted out of recruiter visibility — this is platform
    # oversight, not recruiting, so it isn't subject to that privacy toggle.
    filters = [models.User.account_type == models.AccountType.developer]
    if current_user.email != ADMIN_EMAIL:
        filters.append(models.User.visible_to_recruiters.is_(True))
    query = db.query(models.User).filter(*filters)

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
        "github_connected": bool(user.github_access_token),
        "availability": user.availability,
        "plan": user.plan,
        "discord_id": user.discord_id,
        "account_type": user.account_type,
        "company_name": user.company_name,
        "recruiter_approved": user.recruiter_approved,
        "visible_to_recruiters": user.visible_to_recruiters,
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


@app.post("/users/{user_id}/contact-request")
def send_contact_request(
    user_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    require_approved_recruiter(current_user)

    developer = db.query(models.User).filter(models.User.id == user_id).first()
    # Not found if: the id doesn't exist, it isn't a developer account (recruiters
    # can't contact-request each other or an admin), or the developer opted out of
    # recruiter visibility — visible_to_recruiters is the developer's privacy control,
    # and it would be meaningless if a recruiter could route around it by id.
    if (
        not developer
        or developer.account_type != models.AccountType.developer
        or not developer.visible_to_recruiters
    ):
        raise HTTPException(status_code=404, detail="User not found")

    email_utils.send_recruiter_contact_email(
        to_email=developer.email,
        developer_name=developer.full_name or "there",
        company_name=current_user.company_name or "a company",
        profile_url=f"{email_utils.FRONTEND_URL}/profile/{developer.id}",
    )

    # The developer's real email is never handed back to the recruiter — only a
    # confirmation that the notification went out.
    return {"detail": "Contact request sent"}


# ---------- Admin ----------

def _delete_project_dependents(db: Session, project_id: str) -> None:
    """Deletes everything that references a project (positions and their
    applications, team memberships, comments, feedback) without touching the
    project row itself or committing — shared by the owner-facing DELETE
    /projects/{id} (further down) and the admin routes below, which both then
    delete the project row and commit on their own."""
    position_ids = [
        p.id for p in db.query(models.Position).filter(models.Position.project_id == project_id).all()
    ]
    db.query(models.Application).filter(models.Application.position_id.in_(position_ids)).delete(synchronize_session=False)
    db.query(models.TeamMember).filter(models.TeamMember.project_id == project_id).delete(synchronize_session=False)
    db.query(models.Position).filter(models.Position.project_id == project_id).delete(synchronize_session=False)
    db.query(models.ProjectComment).filter(models.ProjectComment.project_id == project_id).delete(synchronize_session=False)
    db.query(models.Feedback).filter(models.Feedback.project_id == project_id).delete(synchronize_session=False)


@app.get("/admin/stats")
def get_admin_stats(
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    return {
        "total_users": db.query(models.User).count(),
        "total_projects": db.query(models.Project).count(),
        "active_projects": db.query(models.Project).filter(models.Project.status == models.ProjectStatus.active).count(),
        "completed_projects": db.query(models.Project).filter(models.Project.status == models.ProjectStatus.completed).count(),
        "pending_recruiters": db.query(models.User).filter(
            models.User.account_type == models.AccountType.recruiter,
            models.User.recruiter_approved.is_(False),
        ).count(),
    }


@app.get("/admin/pending-recruiters")
def list_pending_recruiters(
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    recruiters = db.query(models.User).filter(
        models.User.account_type == models.AccountType.recruiter,
        models.User.recruiter_approved.is_(False),
    ).order_by(models.User.created_at.asc()).all()
    return [
        {
            "id": r.id,
            "email": r.email,
            "full_name": r.full_name,
            "company_name": r.company_name,
            "created_at": r.created_at,
        }
        for r in recruiters
    ]


@app.post("/admin/approve-recruiter/{user_id}")
def approve_recruiter(
    user_id: str,
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.account_type != models.AccountType.recruiter:
        raise HTTPException(status_code=400, detail="This user is not a recruiter account")

    user.recruiter_approved = True
    db.commit()
    db.refresh(user)
    return {"detail": "Recruiter approved", "user_id": user.id}


@app.post("/admin/reject-recruiter/{user_id}")
def reject_recruiter(
    user_id: str,
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.account_type != models.AccountType.recruiter:
        raise HTTPException(status_code=400, detail="This user is not a recruiter account")

    # No separate "rejected" state — a rejected recruiter application just becomes
    # a normal developer account. Simpler than adding a third status, and it means
    # the person isn't locked out of the platform entirely, just out of recruiting.
    user.account_type = models.AccountType.developer
    user.recruiter_approved = False
    user.company_name = None
    db.commit()
    db.refresh(user)
    return {"detail": "Recruiter application rejected", "user_id": user.id}


@app.get("/admin/users")
def list_all_users(
    search: Optional[str] = None,
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    query = db.query(models.User)
    if search:
        query = query.filter(models.User.email.ilike(f"%{search}%"))
    users = query.order_by(models.User.created_at.desc()).all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "account_type": u.account_type,
            "recruiter_approved": u.recruiter_approved,
            "company_name": u.company_name,
            "plan": u.plan,
            "created_at": u.created_at,
        }
        for u in users
    ]


@app.delete("/admin/users/{user_id}")
def admin_delete_user(
    user_id: str,
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot delete your own admin account")

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Every project this user owns goes too, with that project's own dependents.
    owned_project_ids = [p.id for p in db.query(models.Project).filter(models.Project.owner_id == user_id).all()]
    for project_id in owned_project_ids:
        _delete_project_dependents(db, project_id)
    if owned_project_ids:
        db.query(models.Project).filter(models.Project.id.in_(owned_project_ids)).delete(synchronize_session=False)

    # And the user's own footprint elsewhere: applications/memberships on other
    # people's projects, comments they left, work history, and feedback they gave
    # or received.
    db.query(models.Application).filter(models.Application.user_id == user_id).delete(synchronize_session=False)
    db.query(models.TeamMember).filter(models.TeamMember.user_id == user_id).delete(synchronize_session=False)
    db.query(models.ProjectComment).filter(models.ProjectComment.user_id == user_id).delete(synchronize_session=False)
    db.query(models.WorkExperience).filter(models.WorkExperience.user_id == user_id).delete(synchronize_session=False)
    db.query(models.Education).filter(models.Education.user_id == user_id).delete(synchronize_session=False)
    db.query(models.Feedback).filter(
        or_(models.Feedback.from_user_id == user_id, models.Feedback.to_user_id == user_id)
    ).delete(synchronize_session=False)

    db.delete(user)
    db.commit()
    return {"ok": True}


@app.get("/admin/projects")
def list_all_projects(
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    projects = db.query(models.Project).order_by(models.Project.created_at.desc()).all()
    owners = {
        u.id: u for u in db.query(models.User).filter(
            models.User.id.in_({p.owner_id for p in projects})
        ).all()
    }
    return [
        {
            "id": p.id,
            "title": p.title,
            "status": p.status,
            "owner_id": p.owner_id,
            "owner_email": owners[p.owner_id].email if p.owner_id in owners else None,
            "created_at": p.created_at,
        }
        for p in projects
    ]


@app.delete("/admin/projects/{project_id}")
def admin_delete_project(
    project_id: str,
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    _delete_project_dependents(db, project_id)
    db.delete(project)
    db.commit()
    return {"ok": True}


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
def create_work_experience(
    user_id: str,
    experience: schemas.WorkExperienceCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only add work experience to your own profile")

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
def delete_work_experience(
    experience_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    experience = db.query(models.WorkExperience).filter(models.WorkExperience.id == experience_id).first()
    if not experience:
        raise HTTPException(status_code=404, detail="Work experience not found")
    if experience.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own work experience")

    db.delete(experience)
    db.commit()
    return {"ok": True}


# ---------- Education ----------

@app.post("/users/{user_id}/education", response_model=schemas.EducationOut)
def create_education(
    user_id: str,
    education: schemas.EducationCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only add education to your own profile")

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
def delete_education(
    education_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    education = db.query(models.Education).filter(models.Education.id == education_id).first()
    if not education:
        raise HTTPException(status_code=404, detail="Education not found")
    if education.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own education")

    db.delete(education)
    db.commit()
    return {"ok": True}


# ---------- Projects ----------

def calculate_project_health(project: models.Project, db: Session, last_commit_at: Optional[datetime] = None) -> str:
    """Classify a project's momentum from its most recent activity: a newly opened
    position, a newly submitted application, a newly joined team member, or (when
    available) a real GitHub commit — whichever is most recent. Falls back to the
    project's own creation date if none of those exist yet, so a freshly published
    project reads as "active" rather than "stale"."""
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

    if last_commit_at and last_commit_at > last_activity:
        last_activity = last_commit_at

    days_since = (datetime.utcnow() - last_activity).days

    if days_since < 7:
        return "active"
    if days_since <= 21:
        return "slow"
    return "stale"


def get_project_last_commit(project: models.Project, db: Session) -> Optional[datetime]:
    """Best-effort fetch of the project's real GitHub last-commit date (cached, see
    github_utils). Returns None whenever there's no repo, no owner token, or the
    GitHub request fails for any reason — never raises."""
    if not project.github_repo_url:
        return None
    try:
        full_repo_name = github_utils.repo_full_name_from_url(project.github_repo_url)
    except Exception:
        return None
    owner = db.query(models.User).filter(models.User.id == project.owner_id).first()
    access_token = owner.github_access_token if owner else None
    return github_utils.get_last_commit_date_cached(full_repo_name, access_token)


MAX_ACTIVE_PROJECTS_PER_USER = 10
DUPLICATE_TITLE_SIMILARITY_THRESHOLD = 0.9
DUPLICATE_TITLE_LOOKBACK_HOURS = 24


@app.post("/projects", response_model=schemas.ProjectOut)
def create_project(
    project: schemas.ProjectCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    active_project_count = (
        db.query(models.Project)
        .filter(
            models.Project.owner_id == current_user.id,
            models.Project.status == models.ProjectStatus.active,
        )
        .count()
    )
    if active_project_count >= MAX_ACTIVE_PROJECTS_PER_USER:
        raise HTTPException(
            status_code=429,
            detail="You have too many active projects open. Complete or archive some before publishing a new one.",
        )

    recent_cutoff = datetime.utcnow() - timedelta(hours=DUPLICATE_TITLE_LOOKBACK_HOURS)
    recent_titles = [
        row[0]
        for row in db.query(models.Project.title)
        .filter(
            models.Project.owner_id == current_user.id,
            models.Project.created_at >= recent_cutoff,
        )
        .all()
    ]
    new_title_normalized = project.title.strip().lower()
    for existing_title in recent_titles:
        similarity = difflib.SequenceMatcher(
            None, new_title_normalized, (existing_title or "").strip().lower()
        ).ratio()
        if similarity >= DUPLICATE_TITLE_SIMILARITY_THRESHOLD:
            raise HTTPException(
                status_code=400,
                detail="You already have a very similar project. Please edit your existing project instead of creating a duplicate.",
            )

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
        last_commit_at = get_project_last_commit(p, db)
        p.health = calculate_project_health(p, db, last_commit_at=last_commit_at)
        p.last_commit_at = last_commit_at

    return projects


@app.get("/projects/{project_id}", response_model=schemas.ProjectOut)
def get_project(project_id: str, db: Session = Depends(get_db)):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    last_commit_at = get_project_last_commit(project, db)
    project.health = calculate_project_health(project, db, last_commit_at=last_commit_at)
    project.last_commit_at = last_commit_at
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

    _delete_project_dependents(db, project_id)
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


@app.post("/projects/{project_id}/discord-room")
def create_discord_room(
    project_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the project owner can create a Discord room")

    active_members = db.query(models.TeamMember).filter(
        models.TeamMember.project_id == project_id,
        models.TeamMember.left_at.is_(None),
    ).all()

    relevant_users = []
    seen_user_ids = set()
    for member in active_members:
        user = db.query(models.User).filter(models.User.id == member.user_id).first()
        if user and user.id not in seen_user_ids:
            relevant_users.append(user)
            seen_user_ids.add(user.id)

    # The owner should always be able to see the room they're creating, even if
    # they aren't in team_members themselves (they only get a row there if they
    # also hold one of the project's positions).
    if current_user.id not in seen_user_ids:
        relevant_users.append(current_user)

    connected_users = [u for u in relevant_users if u.discord_id]
    not_connected_users = [u for u in relevant_users if not u.discord_id]

    channel_name = discord_utils.slugify_channel_name(project.title)

    try:
        channel_id = discord_utils.create_team_channel(channel_name, [u.discord_id for u in connected_users])
        invite_url = discord_utils.create_invite(channel_id)
    except Exception as exc:
        print(f"[create_discord_room] Failed to create Discord channel: {exc}")
        raise HTTPException(status_code=502, detail="Could not create Discord channel. Please try again later.")

    project.discord_channel_id = channel_id
    project.discord_invite_url = invite_url
    db.commit()

    return {
        "channel_id": channel_id,
        "invite_url": invite_url,
        "not_connected": [
            {"id": u.id, "full_name": u.full_name, "email": u.email} for u in not_connected_users
        ],
    }


@app.post("/projects/{project_id}/create-repo")
def create_project_repo(
    project_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the project owner can create a GitHub repo")
    if not current_user.github_access_token:
        raise HTTPException(status_code=400, detail="You must connect GitHub first")

    repo_name = github_utils.slugify_repo_name(project.title)

    try:
        repo = github_utils.create_repo(current_user.github_access_token, repo_name, project.description)
    except Exception as exc:
        print(f"[create_project_repo] Failed to create GitHub repo: {exc}")
        raise HTTPException(status_code=502, detail="Could not create GitHub repo. Please try again later.")

    project.github_repo_url = repo["html_url"]
    db.commit()

    active_members = db.query(models.TeamMember).filter(
        models.TeamMember.project_id == project_id,
        models.TeamMember.left_at.is_(None),
    ).all()

    relevant_users = []
    seen_user_ids = set()
    for member in active_members:
        user = db.query(models.User).filter(models.User.id == member.user_id).first()
        if user and user.id not in seen_user_ids and user.id != current_user.id:
            relevant_users.append(user)
            seen_user_ids.add(user.id)

    not_connected_users = [u for u in relevant_users if not u.github_username]
    invited_users = []
    for user in relevant_users:
        if not user.github_username:
            continue
        try:
            github_utils.add_collaborator(current_user.github_access_token, repo["full_name"], user.github_username)
            invited_users.append(user)
        except Exception as exc:
            print(f"[create_project_repo] Failed to invite {user.github_username} as collaborator: {exc}")
            not_connected_users.append(user)

    return {
        "repo_url": project.github_repo_url,
        "invited": [{"id": u.id, "full_name": u.full_name, "github_username": u.github_username} for u in invited_users],
        "not_connected": [
            {"id": u.id, "full_name": u.full_name, "email": u.email} for u in not_connected_users
        ],
    }


# ---------- Positions ----------

@app.post("/projects/{project_id}/positions", response_model=schemas.PositionOut)
def create_position(
    project_id: str,
    position: schemas.PositionCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the project owner can add positions")

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
def get_project_applications(
    project_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if project.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the project owner can view its applications")

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

    project = db.query(models.Project).filter(models.Project.id == position.project_id).first()
    owner = db.query(models.User).filter(models.User.id == project.owner_id).first() if project else None
    if owner:
        try:
            email_utils.send_new_application_email(
                owner.email,
                owner_name=owner.full_name or owner.email,
                applicant_name=current_user.full_name or current_user.email,
                project_title=project.title,
                role_name=position.role_name,
            )
        except Exception as exc:
            print(f"[create_application] Failed to send new-application email to {owner.email}: {exc}")

    return new_application


@app.post("/applications/{application_id}/accept")
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

    applicant = db.query(models.User).filter(models.User.id == application.user_id).first()
    if applicant:
        try:
            email_utils.send_application_accepted_email(
                applicant.email,
                applicant_name=applicant.full_name or applicant.email,
                project_title=project.title,
                role_name=position.role_name,
                project_id=project.id,
            )
        except Exception as exc:
            print(f"[accept_application] Failed to send acceptance email to {applicant.email}: {exc}")

    github_collaborator_added = False
    applicant_needs_github = False

    owner = db.query(models.User).filter(models.User.id == project.owner_id).first()
    if project.github_repo_url and applicant:
        if applicant.github_username and owner and owner.github_access_token:
            try:
                full_repo_name = github_utils.repo_full_name_from_url(project.github_repo_url)
                github_utils.add_collaborator(owner.github_access_token, full_repo_name, applicant.github_username)
                github_collaborator_added = True
            except Exception as exc:
                print(f"[accept_application] Failed to invite {applicant.github_username} as collaborator: {exc}")
        elif not applicant.github_username:
            applicant_needs_github = True

    return {
        "id": application.id,
        "position_id": application.position_id,
        "user_id": application.user_id,
        "status": application.status,
        "applied_at": application.applied_at,
        "github_collaborator_added": github_collaborator_added,
        "applicant_needs_github": applicant_needs_github,
    }


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

@app.get("/projects/{project_id}/team")
def list_team_members(project_id: str, db: Session = Depends(get_db)):
    """Public — team membership (who's on a project) is treated the same as the
    rest of a project's page: visible to anyone, no per-member email exposed here
    (unlike the owner-gated /applications endpoint), just enough to render a name
    and role."""
    members = db.query(models.TeamMember).filter(models.TeamMember.project_id == project_id).all()

    user_ids = {m.user_id for m in members}
    users = {u.id: u for u in db.query(models.User).filter(models.User.id.in_(user_ids)).all()}

    position_ids = {m.position_id for m in members}
    positions = {p.id: p for p in db.query(models.Position).filter(models.Position.id.in_(position_ids)).all()}

    return [
        {
            "id": m.id,
            "project_id": m.project_id,
            "user_id": m.user_id,
            "position_id": m.position_id,
            "joined_at": m.joined_at,
            "left_at": m.left_at,
            "full_name": users[m.user_id].full_name if m.user_id in users else None,
            "role_name": positions[m.position_id].role_name if m.position_id in positions else None,
        }
        for m in members
    ]


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


@app.post("/team_members/{member_id}/remove", response_model=schemas.TeamMemberOut)
def remove_team_member(
    member_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Owner-initiated equivalent of leave_team — same handoff mechanic (reopens
    the vacated position), just triggered by the project owner instead of the
    member themselves."""
    member = db.query(models.TeamMember).filter(models.TeamMember.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Team membership not found")

    project = db.query(models.Project).filter(models.Project.id == member.project_id).first()
    if not project or project.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the project owner can remove a team member")
    if member.left_at is not None:
        raise HTTPException(status_code=400, detail="This member has already left")

    member.left_at = datetime.utcnow()

    position = db.query(models.Position).filter(models.Position.id == member.position_id).first()
    position.status = models.PositionStatus.open  # handoff mechanic triggers here

    db.commit()
    db.refresh(member)

    removed_user = db.query(models.User).filter(models.User.id == member.user_id).first()
    if removed_user:
        try:
            email_utils.send_member_removed_email(
                removed_user.email,
                removed_user.full_name or removed_user.email,
                project.title,
            )
        except Exception as exc:
            print(f"[remove_team_member] Failed to send removal email to {removed_user.email}: {exc}")

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
@limiter.limit("10/minute")
def login(request: Request, email: str, password: str, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user or not auth.verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    token = auth.create_access_token(data={"sub": user.id})
    return {"access_token": token, "token_type": "bearer", "user_id": user.id}


@app.post("/forgot-password")
@limiter.limit("5/hour")
def forgot_password(request: Request, payload: schemas.ForgotPasswordRequest, db: Session = Depends(get_db)):
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


# ---------- OAuth state (CSRF protection for account-linking flows) ----------
#
# Discord/GitHub "connect" redirects the browser away from ErNord entirely, so the
# callback can't rely on anything the frontend already had in hand for CSRF protection
# — it needs a token that's tied to *this* login and *this* connect click. state is a
# single-use, short-lived token minted at /connect time and required back at
# /callback time; without it a code obtained via an attacker's own OAuth flow could be
# replayed against a logged-in victim to link the attacker's account instead (see
# SECURITY_AUDIT.md finding #4). Kept in memory rather than the DB since it's only
# ever needed for the few minutes between /connect and /callback — same tradeoff as
# github_utils's last-commit cache.
_oauth_states: dict[str, tuple[str, float]] = {}  # state -> (user_id, expires_at)
_OAUTH_STATE_TTL_SECONDS = 600  # 10 minutes — plenty for a user to complete the consent screen


def _create_oauth_state(user_id: str) -> str:
    state = secrets.token_urlsafe(32)
    _oauth_states[state] = (user_id, datetime.utcnow().timestamp() + _OAUTH_STATE_TTL_SECONDS)
    return state


def _consume_oauth_state(state: str, user_id: str) -> bool:
    """Check that `state` was minted for `user_id` and hasn't expired, then delete it
    so it can never be replayed (whether the check passes or fails)."""
    entry = _oauth_states.pop(state, None)
    if not entry:
        return False
    stored_user_id, expires_at = entry
    return stored_user_id == user_id and datetime.utcnow().timestamp() <= expires_at


# ---------- Discord ----------

@app.get("/discord/connect")
def discord_connect(current_user: models.User = Depends(get_current_user)):
    state = _create_oauth_state(current_user.id)
    return {"url": discord_utils.get_oauth_url(state)}


@app.post("/discord/callback")
def discord_callback(
    payload: schemas.DiscordCallbackRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not _consume_oauth_state(payload.state, current_user.id):
        raise HTTPException(status_code=400, detail="Invalid or expired connection request. Please try again.")

    try:
        access_token = discord_utils.exchange_code_for_token(payload.code)
        discord_id = discord_utils.get_discord_user_id(access_token)
    except Exception as exc:
        print(f"[discord_callback] Failed to connect Discord account: {exc}")
        raise HTTPException(status_code=400, detail="Could not connect Discord account. Please try again.")

    current_user.discord_id = discord_id
    db.commit()
    db.refresh(current_user)
    return {"discord_id": current_user.discord_id}


# ---------- GitHub ----------

@app.get("/github/connect")
def github_connect(current_user: models.User = Depends(get_current_user)):
    state = _create_oauth_state(current_user.id)
    return {"url": github_utils.get_oauth_url(state)}


@app.post("/github/callback")
def github_callback(
    payload: schemas.GithubCallbackRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not _consume_oauth_state(payload.state, current_user.id):
        raise HTTPException(status_code=400, detail="Invalid or expired connection request. Please try again.")

    try:
        access_token = github_utils.exchange_code_for_token(payload.code)
        github_username = github_utils.get_github_username(access_token)
    except Exception as exc:
        print(f"[github_callback] Failed to connect GitHub account: {exc}")
        raise HTTPException(status_code=400, detail="Could not connect GitHub account. Please try again.")

    current_user.github_username = github_username
    current_user.github_access_token = access_token
    db.commit()
    db.refresh(current_user)
    return {"github_username": current_user.github_username, "github_connected": True}


# ---------- Contact ----------

@app.post("/contact")
@limiter.limit("5/hour")
def submit_contact_message(request: Request, payload: schemas.ContactMessageCreate):
    try:
        email_utils.send_contact_message_email(payload.name, payload.email, payload.message)
    except Exception as exc:
        print(f"[submit_contact_message] Failed to send contact email: {exc}")
        raise HTTPException(status_code=502, detail="Could not send your message. Please try again later.")

    return {"message": "Thanks for reaching out — we'll get back to you soon."}