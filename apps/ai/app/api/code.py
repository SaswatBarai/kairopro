from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel
from typing import Dict, Any, List
from app.agents.orchestrator import Orchestrator
from app.agents.base_agent import AgentContext

router = APIRouter()
orchestrator = Orchestrator()

class DevelopRequest(BaseModel):
    projectId: str
    runId: str
    architecture: Dict[str, Any]
    prd: Dict[str, Any]
    design: Dict[str, Any]

@router.post("/develop")
async def start_development(req: DevelopRequest, background_tasks: BackgroundTasks):
    context = AgentContext(
        project_id=req.projectId,
        run_id=req.runId,
        input_data={
            "architecture": req.architecture,
            "prd": req.prd,
            "design": req.design
        }
    )
    
    # Run Developer Agent in background
    background_tasks.add_task(orchestrator.run_agent, "developer", context)
    return {"status": "started", "runId": req.runId}

class TestRequest(BaseModel):
    projectId: str
    runId: str

@router.post("/test")
async def start_testing(req: TestRequest, background_tasks: BackgroundTasks):
    context = AgentContext(project_id=req.projectId, run_id=req.runId, input_data={})
    background_tasks.add_task(orchestrator.run_agent, "testing", context)
    return {"status": "started", "runId": req.runId}
