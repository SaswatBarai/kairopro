"""PRD generation router — stub for Phase 4."""
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class PRDRequest(BaseModel):
    projectId: str
    runId: str


@router.post("/prd")
async def generate_prd(body: PRDRequest):
    """Generate PRD from locked requirements. Phase 4."""
    return {"status": "stub", "message": f"PRD generation stub for project {body.projectId}."}
