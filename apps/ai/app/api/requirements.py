from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Dict, Any, List

from app.agents.orchestrator import Orchestrator

router = APIRouter()

class AnalyzeRequest(BaseModel):
    projectId: str
    runId: str
    input: Dict[str, Any]

@router.post("/analyze")
async def run_requirement_analysis(req: AnalyzeRequest, background_tasks: BackgroundTasks):
    orchestrator = Orchestrator()
    
    # We run the agent in the background so the HTTP request returns immediately
    # In a real heavy-duty setup we might use Celery, but BackgroundTasks is fine for this phase
    async def task():
        try:
            # We fetch previous requirements if it's a clarification pass
            await orchestrator.run_agent(req.projectId, req.runId, "requirement", req.input)
        except Exception as e:
            print(f"Agent failed: {e}")

    background_tasks.add_task(task)
    return {"success": True, "message": "Analysis started"}

@router.post("/clarify")
async def clarify_requirements(req: AnalyzeRequest, background_tasks: BackgroundTasks):
    # Same endpoint internally for now; the prompt uses input data to realize it's a follow-up
    orchestrator = Orchestrator()
    
    async def task():
        try:
            await orchestrator.run_agent(req.projectId, req.runId, "requirement", req.input)
        except Exception as e:
            print(f"Agent failed: {e}")

    background_tasks.add_task(task)
    return {"success": True, "message": "Clarification analysis started"}
