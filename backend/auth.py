import os
from datetime import datetime, timedelta
from typing import Optional

from dotenv import load_dotenv
from jose import jwt
from passlib.context import CryptContext

load_dotenv()

# Must come from the environment — never hardcode a real secret here again.
# A hardcoded value in this file was previously committed to a public GitHub
# repo, which let anyone forge valid tokens for any user; see SECURITY_AUDIT.md
# finding #1. Fail fast at import time rather than silently running with a
# missing/None key, since jose would otherwise raise a much more confusing error.
SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError(
        "JWT_SECRET_KEY is not set. Generate one with: "
        "python -c \"import secrets; print(secrets.token_hex(32))\" "
        "and add it to backend/.env (and to Railway's environment variables in production)."
    )

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 1 gün

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.JWTError:
        return None


# Separate secret from the login access token above, so a leaked/expired
# password-reset token can never be replayed as a normal auth token (or vice versa).
PASSWORD_RESET_SECRET_KEY = os.getenv("JWT_PASSWORD_RESET_SECRET_KEY")
if not PASSWORD_RESET_SECRET_KEY:
    raise RuntimeError(
        "JWT_PASSWORD_RESET_SECRET_KEY is not set. Generate one with: "
        "python -c \"import secrets; print(secrets.token_hex(32))\" "
        "and add it to backend/.env (and to Railway's environment variables in production)."
    )

PASSWORD_RESET_ALGORITHM = "HS256"
PASSWORD_RESET_EXPIRE_MINUTES = 30


def create_password_reset_token(user_id: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=PASSWORD_RESET_EXPIRE_MINUTES)
    to_encode = {"sub": user_id, "purpose": "password_reset", "exp": expire}
    return jwt.encode(to_encode, PASSWORD_RESET_SECRET_KEY, algorithm=PASSWORD_RESET_ALGORITHM)


def verify_password_reset_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, PASSWORD_RESET_SECRET_KEY, algorithms=[PASSWORD_RESET_ALGORITHM])
    except jwt.JWTError:
        return None

    if payload.get("purpose") != "password_reset":
        return None

    return payload.get("sub")


# Same separation rationale as the password-reset secret above: a leaked/expired
# email-verification link must never double as (or be replayable as) a normal
# access token, so this gets its own secret rather than reusing SECRET_KEY.
EMAIL_VERIFICATION_SECRET_KEY = os.getenv("JWT_EMAIL_VERIFICATION_SECRET_KEY")
if not EMAIL_VERIFICATION_SECRET_KEY:
    raise RuntimeError(
        "JWT_EMAIL_VERIFICATION_SECRET_KEY is not set. Generate one with: "
        "python -c \"import secrets; print(secrets.token_hex(32))\" "
        "and add it to backend/.env (and to Railway's environment variables in production)."
    )

EMAIL_VERIFICATION_ALGORITHM = "HS256"
EMAIL_VERIFICATION_EXPIRE_MINUTES = 60 * 24  # 24 saat


def create_email_verification_token(user_id: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=EMAIL_VERIFICATION_EXPIRE_MINUTES)
    to_encode = {"sub": user_id, "purpose": "email_verification", "exp": expire}
    return jwt.encode(to_encode, EMAIL_VERIFICATION_SECRET_KEY, algorithm=EMAIL_VERIFICATION_ALGORITHM)


def verify_email_verification_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, EMAIL_VERIFICATION_SECRET_KEY, algorithms=[EMAIL_VERIFICATION_ALGORITHM])
    except jwt.JWTError:
        return None

    if payload.get("purpose") != "email_verification":
        return None

    return payload.get("sub")