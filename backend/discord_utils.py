import os
import re
from urllib.parse import urlencode

import requests
from dotenv import load_dotenv

load_dotenv()

DISCORD_BOT_TOKEN = os.getenv("DISCORD_BOT_TOKEN")
DISCORD_CLIENT_ID = os.getenv("DISCORD_CLIENT_ID")
DISCORD_CLIENT_SECRET = os.getenv("DISCORD_CLIENT_SECRET")
DISCORD_GUILD_ID = os.getenv("DISCORD_GUILD_ID")
DISCORD_REDIRECT_URI = os.getenv("DISCORD_REDIRECT_URI")

API_BASE = "https://discord.com/api/v10"

# Discord permission bit flags (see https://discord.com/developers/docs/topics/permissions)
PERMISSION_VIEW_CHANNEL = 1 << 10
PERMISSION_SEND_MESSAGES = 1 << 11
PERMISSION_CONNECT = 1 << 20
PERMISSION_SPEAK = 1 << 21


def get_oauth_url(state: str) -> str:
    """Build the URL that sends a user to Discord's consent screen. guilds.join is
    requested (not used yet) so a future version could auto-add connected users to
    the team guild; for now only identify is actually read back.

    `state` is a caller-generated, single-use token round-tripped through Discord and
    checked against the initiating user on callback, so a code obtained via someone
    else's OAuth flow can't be replayed to link their Discord account to a victim's
    ErNord account (see SECURITY_AUDIT.md finding #4)."""
    params = {
        "client_id": DISCORD_CLIENT_ID,
        "redirect_uri": DISCORD_REDIRECT_URI,
        "response_type": "code",
        "scope": "identify guilds.join",
        "state": state,
    }
    return f"https://discord.com/oauth2/authorize?{urlencode(params)}"


def exchange_code_for_token(code: str) -> str:
    data = {
        "client_id": DISCORD_CLIENT_ID,
        "client_secret": DISCORD_CLIENT_SECRET,
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": DISCORD_REDIRECT_URI,
    }
    headers = {"Content-Type": "application/x-www-form-urlencoded"}
    resp = requests.post(f"{API_BASE}/oauth2/token", data=data, headers=headers, timeout=10)
    resp.raise_for_status()
    return resp.json()["access_token"]


def get_discord_user_id(access_token: str) -> str:
    headers = {"Authorization": f"Bearer {access_token}"}
    resp = requests.get(f"{API_BASE}/users/@me", headers=headers, timeout=10)
    resp.raise_for_status()
    return resp.json()["id"]


def _slugify(title: str) -> str:
    slug = re.sub(r"[^a-z0-9\s-]", "", title.lower())
    slug = re.sub(r"[\s_]+", "-", slug).strip("-")
    return slug or "team"


def slugify_channel_name(title: str) -> str:
    return f"{_slugify(title)[:80]}-team"


def slugify_voice_channel_name(title: str) -> str:
    return f"{_slugify(title)[:80]}-voice"


def create_team_channel(channel_name: str, member_discord_ids: list[str]) -> str:
    """Create a private text channel in the configured guild: @everyone is denied
    view_channel, and each given Discord user ID is granted view_channel + send_messages.
    Permissions are set in the same request as creation, so the channel is never
    briefly visible to the whole server.

    The bot's own user ID is always added to the allow list too — denying @everyone
    would otherwise also block the bot itself (a bot's guild-wide role permissions
    don't override a channel's explicit overwrites), leaving it unable to see or
    manage a room it just created, e.g. when no team member has connected Discord yet.
    For a bot account the user ID and application/client ID are always the same, so
    no extra API call is needed to look it up.
    """
    headers = {"Authorization": f"Bot {DISCORD_BOT_TOKEN}", "Content-Type": "application/json"}

    permission_overwrites = [
        {"id": DISCORD_GUILD_ID, "type": 0, "deny": str(PERMISSION_VIEW_CHANNEL)},
        {
            "id": DISCORD_CLIENT_ID,
            "type": 1,
            "allow": str(PERMISSION_VIEW_CHANNEL | PERMISSION_SEND_MESSAGES),
        },
    ]
    for discord_id in member_discord_ids:
        permission_overwrites.append({
            "id": discord_id,
            "type": 1,
            "allow": str(PERMISSION_VIEW_CHANNEL | PERMISSION_SEND_MESSAGES),
        })

    payload = {
        "name": channel_name,
        "type": 0,  # GUILD_TEXT
        "permission_overwrites": permission_overwrites,
    }

    resp = requests.post(f"{API_BASE}/guilds/{DISCORD_GUILD_ID}/channels", json=payload, headers=headers, timeout=10)
    resp.raise_for_status()
    return resp.json()["id"]


def create_team_voice_channel(channel_name: str, member_discord_ids: list[str]) -> str:
    """Same private-room approach as create_team_channel, but a voice channel
    (type 2) with connect/speak instead of send_messages — a separate channel (and
    separate invite) rather than something layered onto the text channel, since a
    Discord invite always lands the joiner in one specific channel."""
    headers = {"Authorization": f"Bot {DISCORD_BOT_TOKEN}", "Content-Type": "application/json"}

    permission_overwrites = [
        {"id": DISCORD_GUILD_ID, "type": 0, "deny": str(PERMISSION_VIEW_CHANNEL)},
        {
            "id": DISCORD_CLIENT_ID,
            "type": 1,
            "allow": str(PERMISSION_VIEW_CHANNEL | PERMISSION_CONNECT | PERMISSION_SPEAK),
        },
    ]
    for discord_id in member_discord_ids:
        permission_overwrites.append({
            "id": discord_id,
            "type": 1,
            "allow": str(PERMISSION_VIEW_CHANNEL | PERMISSION_CONNECT | PERMISSION_SPEAK),
        })

    payload = {
        "name": channel_name,
        "type": 2,  # GUILD_VOICE
        "permission_overwrites": permission_overwrites,
    }

    resp = requests.post(f"{API_BASE}/guilds/{DISCORD_GUILD_ID}/channels", json=payload, headers=headers, timeout=10)
    resp.raise_for_status()
    return resp.json()["id"]


def create_invite(channel_id: str) -> str:
    headers = {"Authorization": f"Bot {DISCORD_BOT_TOKEN}", "Content-Type": "application/json"}
    payload = {"max_age": 0, "max_uses": 0, "unique": True}  # never expires, unlimited uses

    resp = requests.post(f"{API_BASE}/channels/{channel_id}/invites", json=payload, headers=headers, timeout=10)
    resp.raise_for_status()
    return f"https://discord.gg/{resp.json()['code']}"


def grant_channel_access(channel_id: str, discord_id: str, permissions: int) -> None:
    """Adds (or updates) a single member's permission overwrite on an
    already-created channel, without touching the channel's other overwrites.

    create_team_channel/create_team_voice_channel only set overwrites once, for
    whoever was on the team (and had discord_id set) at room-creation time. Anyone
    who joins the team afterward, or connects Discord afterward, is never added to
    that list — @everyone is denied view_channel on these private rooms, so such a
    person has no permission to see the channel at all. Their invite link still
    adds them to the shared guild, but since they can't see the specific project
    channel, Discord's client drops them into whatever channel they *can* see
    (typically a general/default one) instead — this is what backs them into that
    channel. Call this whenever someone gains team membership or a discord_id after
    the fact, to retroactively grant them the same access room-creation would have.
    """
    headers = {"Authorization": f"Bot {DISCORD_BOT_TOKEN}", "Content-Type": "application/json"}
    payload = {"allow": str(permissions), "deny": "0", "type": 1}  # type 1 = member overwrite

    resp = requests.put(
        f"{API_BASE}/channels/{channel_id}/permissions/{discord_id}",
        json=payload, headers=headers, timeout=10,
    )
    resp.raise_for_status()
