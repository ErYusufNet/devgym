import uuid
from datetime import datetime

from sqlalchemy import (
    Column, String, Text, DateTime, ForeignKey, Enum, Integer, UniqueConstraint
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


class ProjectType(str, enum.Enum):
    web = "web"
    mobile = "mobile"
    saas = "saas"
    desktop = "desktop"
    api = "api"
    game = "game"
    testing = "testing"


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
    bio = Column(Text)
    skills = Column(JSON, default=list)
    experience_level = Column(Enum(ExperienceLevel))
    github_username = Column(String)
    availability = Column(String)
    plan = Column(Enum(PlanType), default=PlanType.free)
    years_of_experience = Column(Integer, nullable=True)
    languages = Column(JSON, default=list)
    preferred_title = Column(String, nullable=True)
    discord_id = Column(String, nullable=True)
    github_access_token = Column(String, nullable=True)
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
    project_type = Column(Enum(ProjectType))
    duration_weeks = Column(Integer)
    weekly_hours = Column(Integer)
    timezone = Column(String)
    completion_summary = Column(Text, nullable=True)
    discord_channel_id = Column(String, nullable=True)
    discord_invite_url = Column(String, nullable=True)
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


class WorkExperience(Base):
    __tablename__ = "work_experiences"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    company = Column(String, nullable=False)
    role = Column(String, nullable=False)
    start_date = Column(String, nullable=False)
    end_date = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Education(Base):
    __tablename__ = "educations"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    school = Column(String, nullable=False)
    degree = Column(String, nullable=False)
    start_date = Column(String, nullable=False)
    end_date = Column(String, nullable=True)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class ProjectComment(Base):
    __tablename__ = "project_comments"

    id = Column(String, primary_key=True, default=generate_uuid)
    project_id = Column(String, ForeignKey("projects.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Feedback(Base):
    __tablename__ = "feedback"
    __table_args__ = (
        UniqueConstraint("project_id", "from_user_id", "to_user_id", name="uq_feedback_project_from_to"),
    )

    id = Column(String, primary_key=True, default=generate_uuid)
    project_id = Column(String, ForeignKey("projects.id"), nullable=False)
    from_user_id = Column(String, ForeignKey("users.id"), nullable=False)
    to_user_id = Column(String, ForeignKey("users.id"), nullable=False)
    communication = Column(Integer, nullable=False)
    reliability = Column(Integer, nullable=False)
    code_quality = Column(Integer, nullable=False)
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)