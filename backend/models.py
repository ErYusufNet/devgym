import uuid
from datetime import datetime

from sqlalchemy import (
    Column, String, Text, DateTime, ForeignKey, Enum
)
from sqlalchemy.dialects.sqlite import JSON
from sqlalchemy.orm import relationship

from database import Base

import enum


def generate_uuid():
    return str(uuid.uuid4())


class ExperienceLevel(str, enum.Enum):
    student = "student"
    junior = "junior"
    mid = "mid"
    senior = "senior"


class PlanType(str, enum.Enum):
    free = "free"
    premium = "premium"


class ProjectStatus(str, enum.Enum):
    active = "active"
    completed = "completed"
    archived = "archived"


class PositionStatus(str, enum.Enum):
    open = "open"
    filled = "filled"


class ApplicationStatus(str, enum.Enum):
    pending = "pending"
    accepted = "accepted"
    rejected = "rejected"


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    full_name = Column(String)
    skills = Column(JSON, default=list)
    experience_level = Column(Enum(ExperienceLevel))
    github_username = Column(String)
    availability = Column(String)
    plan = Column(Enum(PlanType), default=PlanType.free)
    created_at = Column(DateTime, default=datetime.utcnow)

    projects = relationship("Project", back_populates="owner")


class Project(Base):
    __tablename__ = "projects"

    id = Column(String, primary_key=True, default=generate_uuid)
    owner_id = Column(String, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text)
    tech_stack = Column(JSON, default=list)
    github_repo_url = Column(String)
    status = Column(Enum(ProjectStatus), default=ProjectStatus.active)
    created_at = Column(DateTime, default=datetime.utcnow)

    owner = relationship("User", back_populates="projects")
    positions = relationship("Position", back_populates="project")


class Position(Base):
    __tablename__ = "positions"

    id = Column(String, primary_key=True, default=generate_uuid)
    project_id = Column(String, ForeignKey("projects.id"), nullable=False)
    role_name = Column(String, nullable=False)
    description = Column(Text)
    status = Column(Enum(PositionStatus), default=PositionStatus.open)
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="positions")
    applications = relationship("Application", back_populates="position")


class Application(Base):
    __tablename__ = "applications"

    id = Column(String, primary_key=True, default=generate_uuid)
    position_id = Column(String, ForeignKey("positions.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    status = Column(Enum(ApplicationStatus), default=ApplicationStatus.pending)
    applied_at = Column(DateTime, default=datetime.utcnow)

    position = relationship("Position", back_populates="applications")


class TeamMember(Base):
    __tablename__ = "team_members"

    id = Column(String, primary_key=True, default=generate_uuid)
    project_id = Column(String, ForeignKey("projects.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    position_id = Column(String, ForeignKey("positions.id"), nullable=False)
    joined_at = Column(DateTime, default=datetime.utcnow)
    left_at = Column(DateTime, nullable=True)