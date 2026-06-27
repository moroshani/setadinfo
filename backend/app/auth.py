from __future__ import annotations

import base64
import hashlib
import hmac
import secrets
import time

from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .config import get_settings
from .database import get_db
from .models import MonitorTask, User


settings = get_settings()
PASSWORD_ITERATIONS = 310_000


def _sign(payload: str) -> str:
    mac = hmac.new(settings.secret_key.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return f"{payload}.{mac}"


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), PASSWORD_ITERATIONS).hex()
    return f"pbkdf2_sha256${PASSWORD_ITERATIONS}${salt}${digest}"


def verify_password(password: str, encoded: str) -> bool:
    try:
        algorithm, iterations, salt, expected = encoded.split("$", 3)
        if algorithm != "pbkdf2_sha256":
            return False
        digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), int(iterations)).hex()
        return hmac.compare_digest(digest, expected)
    except (TypeError, ValueError):
        return False


def create_session_token(user_id: str) -> str:
    payload = f"{user_id}:{int(time.time())}"
    return base64.urlsafe_b64encode(_sign(payload).encode()).decode()


def verify_session_token(token: str | None) -> str | None:
    if not token:
        return None
    try:
        decoded = base64.urlsafe_b64decode(token.encode()).decode()
        payload, mac = decoded.rsplit(".", 1)
        expected = hmac.new(settings.secret_key.encode(), payload.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(mac, expected):
            return None
        username, ts = payload.rsplit(":", 1)
        if int(time.time()) - int(ts) > 60 * 60 * 24 * 7:
            return None
        return username
    except Exception:
        return None


def require_user(
    session: str | None = Cookie(default=None, alias="setadinfo_session"),
    db: Session = Depends(get_db),
) -> User:
    user_id = verify_session_token(session)
    user = db.get(User, user_id) if user_id else None
    if not user or not user.enabled:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return user


def require_admin(user: User = Depends(require_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Administrator access required")
    return user


def can_write_tasks(user: User) -> bool:
    return user.role in {"admin", "operator"}


def can_manage_task(user: User, task: MonitorTask) -> bool:
    return user.role == "admin" or (user.role == "operator" and task.owner_id == user.id)
