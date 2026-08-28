"""Architecture generation router — stub for Phase 5."""
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class ArchitectureRequest(BaseModel):
    projectId: str
    runId: str


@router.post("/architecture")
async def generate_architecture(body: ArchitectureRequest):
    """Generate architecture spec. Phase 5."""
    return {"status": "stub", "message": f"Architecture generation stub for project {body.projectId}."}
