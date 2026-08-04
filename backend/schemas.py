from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field

from models import ExperienceLevel, PlanType, ProjectStatus, ProjectType, PositionStatus, ApplicationStatus


# ---------- User ----------

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None
    bio: Optional[str] = None
    skills: Optional[List[str]] = []
    github_username: Optional[str] = None
    availability: Optional[str] = None
    years_of_experience: Optional[int] = None
    languages: Optional[List[str]] = []
    preferred_title: Optional[str] = None


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    bio: Optional[str] = None
    skills: Optional[List[str]] = None
    github_username: Optional[str] = None
    availability: Optional[str] = None
    years_of_experience: Optional[int] = None
    languages: Optional[List[str]] = None
    preferred_title: Optional[str] = None


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
    years_of_experience: Optional[int] = None
    languages: List[str] = []
    preferred_title: Optional[str] = None
    discord_id: Optional[str] = None
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
    health: Optional[str] = None
    last_commit_at: Optional[datetime] = None
    completion_summary: Optional[str] = None
    discord_channel_id: Optional[str] = None
    discord_invite_url: Optional[str] = None

    class Config:
        from_attributes = True


class ProjectCompleteRequest(BaseModel):
    summary: Optional[str] = None


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


# ---------- Project Comment ----------

class ProjectCommentCreate(BaseModel):
    content: str


class ProjectCommentOut(BaseModel):
    id: str
    project_id: str
    user_id: str
    content: str
    created_at: datetime
    author_name: Optional[str] = None

    class Config:
        from_attributes = True


# ---------- Feedback ----------

class FeedbackCreate(BaseModel):
    to_user_id: str
    communication: int = Field(ge=1, le=5)
    reliability: int = Field(ge=1, le=5)
    code_quality: int = Field(ge=1, le=5)
    comment: Optional[str] = None


class FeedbackOut(BaseModel):
    id: str
    project_id: str
    from_user_id: str
    to_user_id: str
    communication: int
    reliability: int
    code_quality: int
    comment: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ---------- Password Reset ----------

class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


# ---------- Discord ----------

class DiscordCallbackRequest(BaseModel):
    code: str


# ---------- GitHub ----------

class GithubCallbackRequest(BaseModel):
    code: str