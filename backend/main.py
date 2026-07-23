from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session

import models
import schemas
from database import engine, get_db

# Veritabanı tablolarını oluştur (ilk çalıştırmada devgym.db dosyası oluşur)
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="DevGym API")


@app.get("/")
def read_root():
    return {"message": "DevGym API çalışıyor"}


# ---------- Users ----------

@app.post("/users", response_model=schemas.UserOut)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == user.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Bu email zaten kayıtlı")

    # NOT: şimdilik şifreyi düz kaydediyoruz, bir sonraki adımda hashleyeceğiz
    new_user = models.User(
        email=user.email,
        password_hash=user.password,
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
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")

    new_project = models.Project(
        owner_id=owner_id,
        title=project.title,
        description=project.description,
        tech_stack=project.tech_stack,
        github_repo_url=project.github_repo_url,
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
        raise HTTPException(status_code=404, detail="Proje bulunamadı")

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