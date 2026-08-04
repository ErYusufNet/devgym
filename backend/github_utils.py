import os
import re
from urllib.parse import urlencode

import requests
from dotenv import load_dotenv

load_dotenv()

GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET")
GITHUB_REDIRECT_URI = os.getenv("GITHUB_REDIRECT_URI")

API_BASE = "https://api.github.com"


def get_oauth_url() -> str:
    """Build the URL that sends a user to GitHub's consent screen. repo scope is
    requested since a connected account is later used to create repos and manage
    collaborators on the owner's behalf."""
    params = {
        "client_id": GITHUB_CLIENT_ID,
        "redirect_uri": GITHUB_REDIRECT_URI,
        "scope": "repo",
    }
    return f"https://github.com/login/oauth/authorize?{urlencode(params)}"


def exchange_code_for_token(code: str) -> str:
    data = {
        "client_id": GITHUB_CLIENT_ID,
        "client_secret": GITHUB_CLIENT_SECRET,
        "code": code,
        "redirect_uri": GITHUB_REDIRECT_URI,
    }
    headers = {"Accept": "application/json"}
    resp = requests.post("https://github.com/login/oauth/access_token", data=data, headers=headers, timeout=10)
    resp.raise_for_status()
    payload = resp.json()
    if "access_token" not in payload:
        raise ValueError(payload.get("error_description") or payload.get("error") or "No access_token in response")
    return payload["access_token"]


def get_github_username(access_token: str) -> str:
    headers = {"Authorization": f"Bearer {access_token}", "Accept": "application/vnd.github+json"}
    resp = requests.get(f"{API_BASE}/user", headers=headers, timeout=10)
    resp.raise_for_status()
    return resp.json()["login"]


def slugify_repo_name(title: str) -> str:
    slug = re.sub(r"[^a-z0-9\s-]", "", title.lower())
    slug = re.sub(r"[\s_]+", "-", slug).strip("-")
    return slug or "project"


def create_repo(access_token: str, name: str, description: str = None) -> dict:
    """Create a private repo owned by the connected user. Returns the GitHub API's
    repo object (at least html_url and full_name are used by callers)."""
    headers = {"Authorization": f"Bearer {access_token}", "Accept": "application/vnd.github+json"}
    payload = {"name": name, "description": description or "", "private": True}
    resp = requests.post(f"{API_BASE}/user/repos", json=payload, headers=headers, timeout=10)
    resp.raise_for_status()
    return resp.json()


def add_collaborator(access_token: str, full_repo_name: str, username: str) -> None:
    """Invite `username` as a collaborator on `owner/repo`. Raises on failure so
    callers can catch per-user errors (e.g. a nonexistent GitHub username) without
    aborting the whole batch."""
    headers = {"Authorization": f"Bearer {access_token}", "Accept": "application/vnd.github+json"}
    resp = requests.put(f"{API_BASE}/repos/{full_repo_name}/collaborators/{username}", headers=headers, timeout=10)
    resp.raise_for_status()


def repo_full_name_from_url(url: str) -> str:
    """Extract 'owner/repo' from a stored github_repo_url like
    'https://github.com/owner/repo'."""
    return "/".join(url.rstrip("/").split("/")[-2:])
