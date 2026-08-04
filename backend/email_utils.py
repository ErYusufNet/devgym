import os
import smtplib
from email.mime.text import MIMEText

from dotenv import load_dotenv

load_dotenv()

SMTP_SERVER = os.getenv("SMTP_SERVER")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_EMAIL = os.getenv("SMTP_EMAIL")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")


def send_email(to_email: str, subject: str, body: str) -> None:
    """Generic single-recipient plaintext email sender, shared by every notification
    below so the SMTP wiring only lives in one place."""
    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = SMTP_EMAIL
    msg["To"] = to_email

    with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
        server.starttls()
        server.login(SMTP_EMAIL, SMTP_PASSWORD)
        server.sendmail(SMTP_EMAIL, [to_email], msg.as_string())


def send_password_reset_email(to_email: str, token: str) -> None:
    reset_link = f"{FRONTEND_URL}/reset-password?token={token}"

    body = (
        "Hi,\n\n"
        "We received a request to reset your Ernord password. "
        "Click the link below to choose a new password. This link expires in 30 minutes.\n\n"
        f"{reset_link}\n\n"
        "If you didn't request this, you can safely ignore this email.\n\n"
        "- Ernord"
    )

    send_email(to_email, "Reset your Ernord password", body)


def send_new_application_email(to_email: str, owner_name: str, applicant_name: str, project_title: str, role_name: str) -> None:
    project_link = f"{FRONTEND_URL}/my-projects"

    body = (
        f"Hi {owner_name},\n\n"
        f"{applicant_name} just applied for the \"{role_name}\" position on your project \"{project_title}\".\n\n"
        f"Review the application here:\n{project_link}\n\n"
        "- Ernord"
    )

    send_email(to_email, f"New application on Ernord: {project_title}", body)


def send_application_accepted_email(to_email: str, applicant_name: str, project_title: str, role_name: str, project_id: str) -> None:
    project_link = f"{FRONTEND_URL}/projects/{project_id}"

    body = (
        f"Hi {applicant_name},\n\n"
        f"Great news — you've been accepted as \"{role_name}\" on \"{project_title}\"!\n\n"
        f"Check out the project here:\n{project_link}\n\n"
        "Welcome to the team!\n\n"
        "- Ernord"
    )

    send_email(to_email, f"You've been accepted! Welcome to {project_title}", body)
