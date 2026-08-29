from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Dict, Any

from app.agents.orchestrator import Orchestrator

router = APIRouter()

class GeneratePRDRequest(BaseModel):
    projectId: str
    runId: str
    requirements: list

@router.post("/generate")
async def generate_prd(req: GeneratePRDRequest, background_tasks: BackgroundTasks):
    orchestrator = Orchestrator()
    
    async def task():
        try:
            await orchestrator.run_agent(
                req.projectId, 
                req.runId, 
                "prd", 
                {"requirements": req.requirements}
            )
        except Exception as e:
            print(f"PRD Agent failed: {e}")

    background_tasks.add_task(task)
    return {"success": True, "message": "PRD generation started"}

class EditPRDRequest(BaseModel):
    projectId: str
    sectionContent: str
    prompt: str

@router.post("/edit")
async def edit_prd_section(req: EditPRDRequest):
    from app.llm.openai_provider import OpenAIProvider
    llm = OpenAIProvider()
    
    system = "You are a Principal Product Manager. You are editing a specific section of a PRD based on a user's request. Output ONLY the updated markdown/HTML for that section. Do not wrap in markdown code blocks, just raw HTML/Markdown."
    user = f"Original Content:\n{req.sectionContent}\n\nUser Request: {req.prompt}\n\nPlease provide the updated content:"
    
    updated_content = await llm.complete(system=system, user=user)
    return {"updatedContent": updated_content}

