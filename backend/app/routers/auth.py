"""Self-service account registration and token authentication endpoints."""
import re

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response
from pydantic import BaseModel, Field
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth import (
    SESSION_COOKIE,
    _DUMMY_PASSWORD_HASH,
    _decode_access_token,
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)
from app.db import get_db
from app.config import settings
from app.models import Organization, User

router = APIRouter(prefix="/auth", tags=["authentication"])


class RegisterBody(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    email: str = Field(min_length=3, max_length=200)
    password: str = Field(min_length=12, max_length=256)
    organization_name: str = Field(min_length=1, max_length=200)


class LoginBody(BaseModel):
    email: str = Field(min_length=3, max_length=200)
    password: str = Field(min_length=1, max_length=256)


def _set_session_cookie(response: Response, token: str, ttl: int) -> None:
    response.set_cookie(
        key=SESSION_COOKIE,
        value=token,
        max_age=ttl,
        httponly=True,
        secure=settings.APP_ENV.lower() == "production",
        samesite="lax",
        path="/",
    )


def _issue_session(user: User, response: Response) -> dict:
    token, ttl = create_access_token(user.id, user.token_version)
    _set_session_cookie(response, token, ttl)
    return {
        "expires_in": ttl,
        "user": _user_data(user),
    }


def _user_data(user: User) -> dict:
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "organization_id": user.org_id,
    }


@router.get("/status")
def auth_status():
    return {"authentication_enabled": True, "registration_enabled": True}


@router.post("/register", status_code=201)
def register(body: RegisterBody, response: Response, db: Session = Depends(get_db)):
    email = body.email.strip().lower()
    if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        raise HTTPException(422, "Enter a valid email address")
    name = body.name.strip()
    organization_name = body.organization_name.strip()
    if not name or not organization_name:
        raise HTTPException(422, "Name and organization are required")
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(409, "An account with this email already exists")

    organization = Organization(name=organization_name)
    db.add(organization)
    db.flush()
    user = User(
        org_id=organization.id,
        name=name,
        email=email,
        role="manager",
        password_hash=hash_password(body.password),
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(409, "An account with this email already exists") from exc
    db.refresh(user)
    return _issue_session(user, response)


@router.post("/login")
def login(body: LoginBody, response: Response, db: Session = Depends(get_db)):
    email = body.email.strip().lower()
    user = db.query(User).filter(User.email == email).first()
    password_hash = user.password_hash if user else _DUMMY_PASSWORD_HASH
    valid_password = verify_password(body.password, password_hash)
    if not user or not valid_password:
        raise HTTPException(
            401,
            "Email or password is incorrect",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return _issue_session(user, response)


@router.post("/logout", status_code=204)
def logout(
    response: Response,
    session_cookie: str | None = Cookie(default=None, alias=SESSION_COOKIE),
    db: Session = Depends(get_db),
):
    if session_cookie:
        try:
            user_id, token_version = _decode_access_token(session_cookie)
        except HTTPException:
            pass
        else:
            user = db.get(User, user_id)
            if user and user.token_version == token_version:
                user.token_version += 1
                db.commit()
    response.delete_cookie(
        key=SESSION_COOKIE,
        path="/",
        httponly=True,
        secure=settings.APP_ENV.lower() == "production",
        samesite="lax",
    )
    response.status_code = 204
    return response


@router.get("/me")
def me(user: User = Depends(get_current_user)):
    return _user_data(user)
