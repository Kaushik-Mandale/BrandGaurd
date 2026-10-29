"""Password verification and signed bearer-token authentication."""
import base64
import binascii
import hashlib
import hmac
import json
import secrets
import time

from fastapi import Cookie, Depends, HTTPException, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.models import User

_TOKEN_SECRET = settings.AUTH_SECRET_KEY.encode("utf-8") or secrets.token_bytes(32)
_PASSWORD_ITERATIONS = 310_000
_bearer = HTTPBearer(auto_error=False)
_TOKEN_ISSUER = "brandguard"
SESSION_COOKIE = "brandguard_session"
_DUMMY_PASSWORD_HASH = (
    "pbkdf2_sha256$310000$MDEyMzQ1Njc4OWFiY2RlZg$"
    "ZbmmWlBo8AXJl2TlP3tE64j-K9elzvr-Y2lW0MFc-xQ"
)


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    derived = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt, _PASSWORD_ITERATIONS
    )
    return "pbkdf2_sha256${}${}${}".format(
        _PASSWORD_ITERATIONS,
        _encode(salt),
        _encode(derived),
    )


def verify_password(password: str, password_hash: str | None) -> bool:
    if not password_hash:
        return False
    try:
        scheme, iterations, salt, expected = password_hash.split("$", 3)
        if scheme != "pbkdf2_sha256":
            return False
        derived = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            _decode(salt),
            int(iterations),
        )
        return hmac.compare_digest(_encode(derived), expected)
    except (ValueError, TypeError):
        return False


def create_access_token(user_id: int, token_version: int = 0) -> tuple[str, int]:
    ttl = max(1, settings.AUTH_TOKEN_TTL_MINUTES) * 60
    now = int(time.time())
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {
        "sub": str(user_id),
        "ver": token_version,
        "iss": _TOKEN_ISSUER,
        "iat": now,
        "exp": now + ttl,
    }
    unsigned = f"{_encode_json(header)}.{_encode_json(payload)}"
    signature = hmac.new(_TOKEN_SECRET, unsigned.encode("ascii"), hashlib.sha256).digest()
    return f"{unsigned}.{_encode(signature)}", ttl


def _decode_access_token(token: str) -> tuple[int, int]:
    try:
        encoded_header, encoded_payload, encoded_signature = token.split(".")
        unsigned = f"{encoded_header}.{encoded_payload}"
        expected = hmac.new(_TOKEN_SECRET, unsigned.encode("ascii"), hashlib.sha256).digest()
        if not hmac.compare_digest(expected, _decode(encoded_signature)):
            raise ValueError("Invalid signature")
        header = json.loads(_decode(encoded_header))
        payload = json.loads(_decode(encoded_payload))
        if header != {"alg": "HS256", "typ": "JWT"}:
            raise ValueError("Unsupported token")
        if payload.get("iss") != _TOKEN_ISSUER or int(payload["exp"]) <= int(time.time()):
            raise ValueError("Expired or invalid token")
        user_id = int(payload["sub"])
        token_version = int(payload.get("ver", 0))
        if user_id < 1:
            raise ValueError("Invalid subject")
        if token_version < 0:
            raise ValueError("Invalid token version")
        return user_id, token_version
    except (ValueError, TypeError, KeyError, json.JSONDecodeError, binascii.Error, UnicodeDecodeError) as exc:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired access token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
    session_cookie: str | None = Cookie(default=None, alias=SESSION_COOKIE),
    db: Session = Depends(get_db),
) -> User:
    if credentials and credentials.scheme.lower() == "bearer":
        token = credentials.credentials
    elif session_cookie:
        token = session_cookie
        if request.method not in {"GET", "HEAD", "OPTIONS"}:
            origin = request.headers.get("origin")
            if origin != settings.FRONTEND_ORIGIN.rstrip("/"):
                raise HTTPException(403, "Invalid request origin")
    else:
        raise HTTPException(
            status_code=401,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_id, token_version = _decode_access_token(token)
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=401,
            detail="User account no longer exists",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if user.token_version != token_version:
        raise HTTPException(
            status_code=401,
            detail="Session has been revoked",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def _encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


def _decode(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))


def _encode_json(value: dict) -> str:
    return _encode(json.dumps(value, separators=(",", ":"), sort_keys=True).encode("utf-8"))
