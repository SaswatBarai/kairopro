"""Code generation router — stub for Phase 7."""
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class CodeRequest(BaseModel):
    projectId: str
    runId: str
    taskId: str


@router.post("/code")
async def generate_code(body: CodeRequest):
    """Generate code for a task. Phase 7."""
    return {"status": "stub", "message": f"Code generation stub for task {body.taskId}."}


@router.post("/plan")
async def plan_tasks(body: dict):
    """Generate task graph from architecture. Phase 7."""
    return {"status": "stub", "message": "Task planning stub."}
