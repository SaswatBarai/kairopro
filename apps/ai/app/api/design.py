"""Design generation router — stub for Phase 5."""
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class DesignRequest(BaseModel):
    projectId: str
    runId: str


@router.post("/design")
async def generate_design(body: DesignRequest):
    """Generate 3 design options. Phase 5."""
    return {"status": "stub", "message": f"Design generation stub for project {body.projectId}."}
