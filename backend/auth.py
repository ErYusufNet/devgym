from datetime import datetime, timedelta
from typing import Optional

from jose import jwt
from passlib.context import CryptContext

# NOT: Bu gizli anahtar sadece geliştirme (development) içindir.
# İleride .env dosyasına taşıyacağız, asla GitHub'a gerçek anahtarla push etmeyeceğiz.
SECRET_KEY = "devgym-dev-secret-key-degistir-bunu-production-da"
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
PASSWORD_RESET_SECRET_KEY = "devgym-dev-password-reset-secret-key-degistir-bunu-production-da"
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