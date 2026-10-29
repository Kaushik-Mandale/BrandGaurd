from contextlib import asynccontextmanager
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db import init_db
from app.routers import assets, auth, insights, knowledge, review, submissions


@asynccontextmanager
async def lifespan(app: FastAPI):
    if settings.APP_ENV.lower() == "production" and len(settings.AUTH_SECRET_KEY) < 32:
        raise RuntimeError("AUTH_SECRET_KEY must contain at least 32 characters in production.")
    init_db()
    yield


# On Vercel the public rewrite maps /api/(.*) → this service, so the backend
# receives paths that begin with /api.  API_PREFIX lets us shift between
# environments without touching individual routers:
#   - production (Vercel): API_PREFIX=/api   (set by vercel.json env or Vercel dashboard)
#   - local dev:           API_PREFIX=        (empty string, default — keeps existing behaviour)
API_PREFIX: str = os.environ.get("API_PREFIX", "").rstrip("/")

app = FastAPI(
    title="BrandGuard API",
    version="1.0.0",
    description="AI-driven brand compliance auditing",
    lifespan=lifespan,
    # root_path tells OpenAPI/Swagger about the public prefix so docs links work
    root_path=API_PREFIX,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN.rstrip("/")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get(f"{API_PREFIX}/health")
def health():
    return {"status": "ok", "version": "1.0.0"}


app.include_router(knowledge.router,    prefix=API_PREFIX)
app.include_router(submissions.router,  prefix=API_PREFIX)
app.include_router(auth.router,         prefix=API_PREFIX)
app.include_router(review.router,       prefix=API_PREFIX)
app.include_router(review.audit_router, prefix=API_PREFIX)
app.include_router(insights.router,     prefix=API_PREFIX)
app.include_router(assets.router,       prefix=API_PREFIX)
