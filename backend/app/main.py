from contextlib import asynccontextmanager
import logging
import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.db import init_db
from app.routers import assets, auth, insights, knowledge, review, submissions

log = logging.getLogger("brandguard")


@asynccontextmanager
async def lifespan(app: FastAPI):
    if len(settings.AUTH_SECRET_KEY) < 32:
        log.warning("AUTH_SECRET_KEY is less than 32 characters or unset. Using stable fallback secret.")
    try:
        init_db()
    except Exception as exc:
        log.error("Database initialization failed during startup: %s", exc)
    yield


app = FastAPI(
    title="BrandGuard API",
    version="1.0.0",
    description="AI-driven brand compliance auditing",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_ORIGIN.rstrip("/"),
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    log.error("Unhandled exception on %s %s: %s", request.method, request.url.path, exc, exc_info=True)
    detail = str(exc)
    if "could not connect to server" in detail or "Connection refused" in detail:
        detail = "Database connection error. Please verify DATABASE_URL in Vercel environment variables."
    return JSONResponse(
        status_code=500,
        content={"detail": detail},
    )


@app.get("/health")
@app.get("/api/health")
def health():
    return {"status": "ok", "version": "1.0.0"}


# Support routes with and without /api prefix
for prefix in ("", "/api"):
    app.include_router(knowledge.router,    prefix=prefix)
    app.include_router(submissions.router,  prefix=prefix)
    app.include_router(auth.router,         prefix=prefix)
    app.include_router(review.router,       prefix=prefix)
    app.include_router(review.audit_router, prefix=prefix)
    app.include_router(insights.router,     prefix=prefix)
    app.include_router(assets.router,       prefix=prefix)
