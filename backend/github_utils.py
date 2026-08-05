import os
import re
import time
from datetime import datetime
from typing import Optional
from urllib.parse import urlencode

import requests
from dotenv import load_dotenv

load_dotenv()

GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET")
GITHUB_REDIRECT_URI = os.getenv("GITHUB_REDIRECT_URI")

API_BASE = "https://api.github.com"


def get_oauth_url(state: str) -> str:
    """Build the URL that sends a user to GitHub's consent screen. repo scope is
    requested since a connected account is later used to create repos and manage
    collaborators on the owner's behalf.

    `state` is a caller-generated, single-use token round-tripped through GitHub and
    checked against the initiating user on callback, so a code obtained via someone
    else's OAuth flow can't be replayed to link their GitHub account to a victim's
    ErNord account (see SECURITY_AUDIT.md finding #4)."""
    params = {
        "client_id": GITHUB_CLIENT_ID,
        "redirect_uri": GITHUB_REDIRECT_URI,
        "scope": "repo",
        "state": state,
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


def get_last_commit_date(full_repo_name: str, access_token: str = None) -> Optional[datetime]:
    """Fetch the commit date of the most recent commit on the repo's default branch.
    Works without a token (public API), but an owner's token is used when available
    to get a higher rate limit. Returns None if the repo has no commits yet."""
    headers = {"Accept": "application/vnd.github+json"}
    if access_token:
        headers["Authorization"] = f"Bearer {access_token}"
    resp = requests.get(
        f"{API_BASE}/repos/{full_repo_name}/commits",
        params={"per_page": 1},
        headers=headers,
        timeout=10,
    )
    resp.raise_for_status()
    commits = resp.json()
    if not commits:
        return None
    date_str = commits[0]["commit"]["committer"]["date"]  # e.g. "2024-06-01T10:23:45Z"
    # Stored as a naive UTC datetime to stay comparable with the rest of the app's
    # (also naive, datetime.utcnow()-based) timestamps.
    return datetime.fromisoformat(date_str.replace("Z", "+00:00")).replace(tzinfo=None)


# In-memory cache of the last-commit lookup, keyed by "owner/repo". Every project
# listing would otherwise trigger its own GitHub API call (and rate-limit hit);
# a short TTL keeps the health indicator fresh-ish without hammering the API.
_last_commit_cache = {}
_LAST_COMMIT_CACHE_TTL = 3600  # seconds


def get_last_commit_date_cached(full_repo_name: str, access_token: str = None) -> Optional[datetime]:
    """Same as get_last_commit_date, but cached for _LAST_COMMIT_CACHE_TTL seconds and
    never raises — failures (deleted repo, rate limit, network error, ...) are treated
    as "no commit data available" so a GitHub hiccup never breaks project listing."""
    now = time.time()
    cached = _last_commit_cache.get(full_repo_name)
    if cached and (now - cached[0]) < _LAST_COMMIT_CACHE_TTL:
        return cached[1]

    try:
        last_commit_at = get_last_commit_date(full_repo_name, access_token)
    except Exception:
        last_commit_at = None

    _last_commit_cache[full_repo_name] = (now, last_commit_at)
    return last_commit_at
