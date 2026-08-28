"""
KairoPro AI Engine — FastAPI Application
Internal service only. All routes require X-Service-Token header.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.middleware import ServiceTokenMiddleware
from app.telemetry import setup_telemetry

# Routers
from app.api import health, requirements, prd, design, architecture, code, documents


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup / shutdown events."""
    print(f"🚀 KairoPro AI Engine starting on port {settings.PORT}")
    print(f"   Environment: {settings.APP_ENV}")
    setup_telemetry()
    yield
    print("👋 KairoPro AI Engine shutting down")


app = FastAPI(
    title="KairoPro AI Engine",
    description="Internal AI orchestration service. Not publicly accessible.",
    version="0.1.0",
    docs_url="/docs" if settings.APP_ENV == "development" else None,
    redoc_url=None,
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# Middleware
# ---------------------------------------------------------------------------

# CORS — only allow Next.js backend (no browser access)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.PLATFORM_URL],
    allow_methods=["GET", "POST", "DELETE"],
    allow_headers=["Content-Type", "X-Service-Token"],
)

# Service token auth — validates X-Service-Token on all non-health routes
app.add_middleware(ServiceTokenMiddleware)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

app.include_router(health.router, tags=["health"])
app.include_router(requirements.router, prefix="/ai", tags=["requirements"])
app.include_router(prd.router, prefix="/ai", tags=["prd"])
app.include_router(design.router, prefix="/ai", tags=["design"])
app.include_router(architecture.router, prefix="/ai", tags=["architecture"])
app.include_router(code.router, prefix="/ai", tags=["code"])
app.include_router(documents.router, prefix="/ai", tags=["documents"])
