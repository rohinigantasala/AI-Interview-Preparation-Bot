"""Authentication and password hashing helpers for Flask."""

import re
from functools import wraps
from typing import Any, Callable, Dict, Optional, Tuple

from flask import redirect, session, url_for
from werkzeug.security import check_password_hash, generate_password_hash

from database import create_user, get_user_by_email, get_user_by_id

EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def validate_registration(
    full_name: str, email: str, password: str, confirm_password: str
) -> Optional[str]:
    if len((full_name or "").strip()) < 2:
        return "Full name must be at least 2 characters."
    if not EMAIL_REGEX.match((email or "").strip()):
        return "Please enter a valid email address."
    if len(password or "") < 8:
        return "Password must be at least 8 characters long."
    if password != confirm_password:
        return "Passwords do not match."
    return None


def register_user(
    full_name: str, email: str, password: str, confirm_password: str
) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    error = validate_registration(full_name, email, password, confirm_password)
    if error:
        return None, error

    existing = get_user_by_email(email)
    if existing:
        return None, "An account with this email already exists."

    pw_hash = generate_password_hash(password)
    user = create_user(full_name, email, pw_hash)
    return user, None


def authenticate_user(email: str, password: str) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    if not EMAIL_REGEX.match((email or "").strip()):
        return None, "Please enter a valid email address."
    if not password:
        return None, "Please enter your password."

    user = get_user_by_email(email)
    if not user or not check_password_hash(user["password_hash"], password):
        return None, "Invalid email or password."

    return {
        "id": user["id"],
        "full_name": user["full_name"],
        "email": user["email"],
        "created_at": user["created_at"],
    }, None


def get_logged_in_user() -> Optional[Dict[str, Any]]:
    user_id = session.get("user_id")
    if not user_id:
        return None
    return get_user_by_id(int(user_id))


def login_required(view: Callable[..., Any]) -> Callable[..., Any]:
    @wraps(view)
    def wrapped(*args: Any, **kwargs: Any) -> Any:
        if not get_logged_in_user():
            return redirect(url_for("login"))
        return view(*args, **kwargs)

    return wrapped
