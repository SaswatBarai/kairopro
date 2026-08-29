from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel
from typing import Dict, Any, List
from app.agents.orchestrator import Orchestrator

router = APIRouter(prefix="/design", tags=["design"])

class GenerateDesignRequest(BaseModel):
    projectId: str
    runId: str
    prd: Dict[str, Any]

@router.post("/generate")
async def generate_design(req: GenerateDesignRequest, background_tasks: BackgroundTasks):
    orchestrator = Orchestrator()
    
    async def task():
        try:
            await orchestrator.run_agent(
                req.projectId, 
                req.runId, 
                "design", 
                {"prd": req.prd}
            )
        except Exception as e:
            print(f"Design Agent failed: {e}")

    background_tasks.add_task(task)
    return {"success": True, "message": "Design generation started"}
