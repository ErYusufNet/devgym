import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Defaults to a relative path for local dev. In production (Railway), this must
# point inside a mounted Volume — the container filesystem is otherwise
# ephemeral, so the SQLite file (and everything in it) gets wiped on every
# redeploy. See DATABASE_PATH on Railway, pointed at the devgym-volume mount.
DATABASE_PATH = os.getenv("DATABASE_PATH", "./devgym.db")
SQLALCHEMY_DATABASE_URL = f"sqlite:///{DATABASE_PATH}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()