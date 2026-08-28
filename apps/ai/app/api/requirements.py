"""Requirement analysis router — stub for Phase 4."""
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class AnalyzeRequest(BaseModel):
    projectId: str
    runId: str
    problemStatement: str


class AnalyzeResponse(BaseModel):
    status: str
    message: str


@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_requirements(body: AnalyzeRequest):
    """Trigger requirement analysis agent. Full implementation in Phase 4."""
    return AnalyzeResponse(
        status="stub",
        message=f"Requirement analysis stub for project {body.projectId}. Full implementation in Phase 4.",
    )


@router.post("/clarify")
async def process_clarification(body: dict):
    """Process clarification answers and re-analyze. Phase 4."""
    return {"status": "stub", "message": "Clarification processing stub."}
