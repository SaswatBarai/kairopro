"""
Service token authentication middleware.
All routes except /health require a valid X-Service-Token header.
"""

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import settings


class ServiceTokenMiddleware(BaseHTTPMiddleware):
    """Validate X-Service-Token on all non-health routes."""

    EXCLUDED_PATHS = {"/health", "/docs", "/openapi.json"}

    async def dispatch(self, request: Request, call_next):
        if request.url.path in self.EXCLUDED_PATHS:
            return await call_next(request)

        token = request.headers.get("X-Service-Token")
        if not token or token != settings.AI_SERVICE_TOKEN:
            return JSONResponse(
                status_code=401,
                content={"error": "Unauthorized", "message": "Invalid or missing X-Service-Token"},
            )

        return await call_next(request)
