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


def send_email(to_email: str, subject: str, body: str, reply_to: str = None) -> None:
    """Generic single-recipient plaintext email sender, shared by every notification
    below so the SMTP wiring only lives in one place. `reply_to` is only ever passed
    a pydantic-validated EmailStr by callers, so it's safe to drop straight into a
    header (no newlines a real email address could contain)."""
    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = SMTP_EMAIL
    msg["To"] = to_email
    if reply_to:
        msg["Reply-To"] = reply_to

    with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
        server.starttls()
        server.login(SMTP_EMAIL, SMTP_PASSWORD)
        server.sendmail(SMTP_EMAIL, [to_email], msg.as_string())


def send_verification_email(to_email: str, token: str) -> None:
    verify_link = f"{FRONTEND_URL}/verify-email?token={token}"

    body = (
        "Hi,\n\n"
        "Welcome to Ernord! Please verify your email address by clicking the link below. "
        "This link expires in 24 hours.\n\n"
        f"{verify_link}\n\n"
        "If you didn't create this account, you can safely ignore this email.\n\n"
        "- Ernord"
    )

    send_email(to_email, "Verify your Ernord email address", body)


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


def send_team_complete_email(
    to_email: str,
    member_name: str,
    project_title: str,
    project_id: str,
    teammates: list,
    github_repo_url: str = None,
    discord_invite_url: str = None,
) -> None:
    """Sent to every active team member once a project's last open position gets
    filled. `teammates` is the list of the *other* active members, each a dict with
    "name" and "profile_url", so every recipient sees who they're building with."""
    project_link = f"{FRONTEND_URL}/projects/{project_id}"

    teammates_lines = "\n".join(f"- {t['name']} — {t['profile_url']}" for t in teammates) or "(no other active members)"

    extra_lines = []
    if github_repo_url:
        extra_lines.append(f"GitHub repo: {github_repo_url}")
    if discord_invite_url:
        extra_lines.append(f"Discord room: {discord_invite_url}")
    extra_block = ("\n" + "\n".join(extra_lines) + "\n") if extra_lines else ""

    body = (
        f"Hi {member_name},\n\n"
        f"Your team on \"{project_title}\" is complete — every position has been filled!\n\n"
        f"Your teammates:\n{teammates_lines}\n"
        f"{extra_block}\n"
        f"Check out the project here:\n{project_link}\n\n"
        "Time to start building!\n\n"
        "- Ernord"
    )

    send_email(to_email, f"Your team is complete: {project_title}", body)


def send_team_message_email(to_email: str, to_name: str, from_name: str, project_title: str, project_id: str, content: str) -> None:
    """In-platform messaging between teammates, delivered by email — the fallback
    for members who haven't connected Discord. Neither person's real email is
    exposed to the other by this (no Reply-To set), matching team-directory's
    privacy stance; anyone who wants to reply sends another message through the app."""
    project_link = f"{FRONTEND_URL}/projects/{project_id}"

    body = (
        f"Hi {to_name},\n\n"
        f"{from_name} sent you a message about \"{project_title}\":\n\n"
        f"{content}\n\n"
        f"View the project here:\n{project_link}\n\n"
        "- Ernord"
    )

    send_email(to_email, f"{from_name} sent you a message about {project_title}", body)


def send_member_removed_email(to_email: str, member_name: str, project_title: str) -> None:
    body = (
        f"Hi {member_name},\n\n"
        f"You've been removed from \"{project_title}\" by the project owner. "
        "Your position on the team has been reopened for someone else.\n\n"
        f"You can browse other open projects here:\n{FRONTEND_URL}/discover\n\n"
        "- Ernord"
    )

    send_email(to_email, f"You've been removed from {project_title}", body)


def send_recruiter_contact_email(to_email: str, developer_name: str, company_name: str, profile_url: str) -> None:
    """Notifies a developer that an approved recruiter wants to get in touch. The
    developer's real email is the `to_email` here (never handed back to the
    recruiter — see POST /users/{user_id}/contact-request), and the recruiter never
    sees this address either; contact stays mediated by Ernord."""
    body = (
        f"Hi {developer_name},\n\n"
        f"A recruiter from {company_name} viewed your profile on Ernord and would like to get in touch "
        "about an opportunity.\n\n"
        f"You can review your profile here:\n{profile_url}\n\n"
        "- Ernord"
    )

    send_email(to_email, f"A recruiter from {company_name} wants to connect on Ernord", body)


CONTACT_INBOX = "ernordbusiness@hotmail.com"


def send_contact_message_email(name: str, from_email: str, message: str) -> None:
    """Forwards a contact-form submission to the site inbox. The subject is a fixed
    string (not built from user input) so a name/message containing CR/LF can't be
    used for email header injection; `from_email` is set as Reply-To (safe — it's a
    pydantic-validated EmailStr, see send_email) so replying goes straight to the
    visitor."""
    body = (
        "New message from the Ernord contact form.\n\n"
        f"Name: {name}\n"
        f"Email: {from_email}\n\n"
        f"Message:\n{message}\n"
    )

    send_email(CONTACT_INBOX, "New message from the Ernord contact form", body, reply_to=from_email)
