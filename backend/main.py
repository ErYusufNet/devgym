from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime

import auth
import models
import schemas
from database import engine, get_db

# Create database tables (creates devgym.db on first run)
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="DevGym API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {"message": "DevGym API is running"}


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


# ---------- Projects ----------

@app.post("/projects", response_model=schemas.ProjectOut)
def create_project(project: schemas.ProjectCreate, owner_id: str, db: Session = Depends(get_db)):
    owner = db.query(models.User).filter(models.User.id == owner_id).first()
    if not owner:
        raise HTTPException(status_code=404, detail="User not found")

    new_project = models.Project(
        owner_id=owner_id,
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


# ---------- Applications ----------

@app.post("/applications", response_model=schemas.ApplicationOut)
def create_application(application: schemas.ApplicationCreate, db: Session = Depends(get_db)):
    position = db.query(models.Position).filter(models.Position.id == application.position_id).first()
    if not position:
        raise HTTPException(status_code=404, detail="Position not found")
    if position.status != models.PositionStatus.open:
        raise HTTPException(status_code=400, detail="This position is currently filled")

    user = db.query(models.User).filter(models.User.id == application.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    new_application = models.Application(
        position_id=application.position_id,
        user_id=application.user_id,
    )
    db.add(new_application)
    db.commit()
    db.refresh(new_application)
    return new_application


@app.get("/applications", response_model=list[schemas.ApplicationOut])
def list_applications(db: Session = Depends(get_db)):
    return db.query(models.Application).all()


@app.post("/applications/{application_id}/accept", response_model=schemas.ApplicationOut)
def accept_application(application_id: str, db: Session = Depends(get_db)):
    application = db.query(models.Application).filter(models.Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    position = db.query(models.Position).filter(models.Position.id == application.position_id).first()
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
def reject_application(application_id: str, db: Session = Depends(get_db)):
    application = db.query(models.Application).filter(models.Application.id == application_id).first()
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    application.status = models.ApplicationStatus.rejected
    db.commit()
    db.refresh(application)
    return application


# ---------- Team Members ----------

@app.get("/projects/{project_id}/team", response_model=list[schemas.TeamMemberOut])
def list_team_members(project_id: str, db: Session = Depends(get_db)):
    return db.query(models.TeamMember).filter(models.TeamMember.project_id == project_id).all()


@app.post("/team_members/{member_id}/leave", response_model=schemas.TeamMemberOut)
def leave_team(member_id: str, db: Session = Depends(get_db)):
    member = db.query(models.TeamMember).filter(models.TeamMember.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Team membership not found")
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