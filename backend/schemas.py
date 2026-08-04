from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr

from models import ExperienceLevel, PlanType, ProjectStatus, ProjectType, PositionStatus, ApplicationStatus


# ---------- User ----------

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None
    bio: Optional[str] = None
    skills: Optional[List[str]] = []
    experience_level: Optional[ExperienceLevel] = None
    github_username: Optional[str] = None
    availability: Optional[str] = None


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    bio: Optional[str] = None
    skills: Optional[List[str]] = None
    experience_level: Optional[ExperienceLevel] = None
    github_username: Optional[str] = None
    availability: Optional[str] = None


class UserOut(BaseModel):
    id: str
    email: EmailStr
    full_name: Optional[str]
    bio: Optional[str]
    skills: List[str]
    experience_level: Optional[ExperienceLevel]
    github_username: Optional[str]
    availability: Optional[str]
    plan: PlanType
    created_at: datetime

    class Config:
        from_attributes = True


# my name is there so i wouldnt be more proud 
# ---------- Project ----------

class ProjectCreate(BaseModel):
    title: str
    description: Optional[str] = None
    tech_stack: Optional[List[str]] = []
    github_repo_url: Optional[str] = None
    project_type: Optional[ProjectType] = None
    duration_weeks: Optional[int] = None
    weekly_hours: Optional[int] = None
    timezone: Optional[str] = None


class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    tech_stack: Optional[List[str]] = None
    github_repo_url: Optional[str] = None
    project_type: Optional[ProjectType] = None
    duration_weeks: Optional[int] = None
    weekly_hours: Optional[int] = None
    timezone: Optional[str] = None


class ProjectOut(BaseModel):
    id: str
    owner_id: str
    title: str
    description: Optional[str]
    tech_stack: List[str]
    github_repo_url: Optional[str]
    status: ProjectStatus
    project_type: Optional[ProjectType]
    duration_weeks: Optional[int]
    weekly_hours: Optional[int]
    timezone: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ---------- Position ----------

class PositionCreate(BaseModel):
    role_name: str
    description: Optional[str] = None


class PositionOut(BaseModel):
    id: str
    project_id: str
    role_name: str
    description: Optional[str]
    status: PositionStatus
    created_at: datetime

    class Config:
        from_attributes = True


# ---------- Application ----------

class ApplicationCreate(BaseModel):
    position_id: str


class ApplicationOut(BaseModel):
    id: str
    position_id: str
    user_id: str
    status: ApplicationStatus
    applied_at: datetime

    class Config:
        from_attributes = True


# ---------- Team Member ----------

class TeamMemberOut(BaseModel):
    id: str
    project_id: str
    user_id: str
    position_id: str
    joined_at: datetime
    left_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ---------- Work Experience ----------

class WorkExperienceCreate(BaseModel):
    company: str
    role: str
    start_date: str
    end_date: Optional[str] = None
    description: Optional[str] = None


class WorkExperienceOut(BaseModel):
    id: str
    user_id: str
    company: str
    role: str
    start_date: str
    end_date: Optional[str]
    description: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ---------- Education ----------

class EducationCreate(BaseModel):
    school: str
    degree: str
    start_date: str
    end_date: Optional[str] = None
    description: Optional[str] = None


class EducationOut(BaseModel):
    id: str
    user_id: str
    school: str
    degree: str
    start_date: str
    end_date: Optional[str]
    description: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ---------- Password Reset ----------

class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str