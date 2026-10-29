from contextlib import asynccontextmanager

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


app = FastAPI(
    title="BrandGuard API",
    version="1.0.0",
    description="AI-driven brand compliance auditing",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN.rstrip("/")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok", "version": "1.0.0"}


app.include_router(knowledge.router)
app.include_router(submissions.router)
app.include_router(auth.router)
app.include_router(review.router)
app.include_router(review.audit_router)
app.include_router(insights.router)
app.include_router(assets.router)
