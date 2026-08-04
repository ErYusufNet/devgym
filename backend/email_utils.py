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

    msg = MIMEText(body)
    msg["Subject"] = "Reset your Ernord password"
    msg["From"] = SMTP_EMAIL
    msg["To"] = to_email

    with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
        server.starttls()
        server.login(SMTP_EMAIL, SMTP_PASSWORD)
        server.sendmail(SMTP_EMAIL, [to_email], msg.as_string())
