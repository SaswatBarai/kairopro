from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel
from typing import Dict, Any

from app.agents.orchestrator import Orchestrator

router = APIRouter(prefix="/architecture", tags=["architecture"])

class GenerateArchRequest(BaseModel):
    projectId: str
    runId: str
    prd: Dict[str, Any]
    design: Dict[str, Any]

@router.post("/generate")
async def generate_architecture(req: GenerateArchRequest, background_tasks: BackgroundTasks):
    orchestrator = Orchestrator()
    
    async def task():
        try:
            await orchestrator.run_agent(
                req.projectId, 
                req.runId, 
                "architecture", 
                {"prd": req.prd, "design": req.design}
            )
        except Exception as e:
            print(f"Architecture Agent failed: {e}")

    background_tasks.add_task(task)
    return {"success": True, "message": "Architecture generation started"}

class ModifyArchRequest(BaseModel):
    projectId: str
    currentArch: Dict[str, Any]
    prompt: str

@router.post("/modify")
async def modify_architecture(req: ModifyArchRequest):
    from app.llm.openai_provider import OpenAIProvider
    llm = OpenAIProvider()
    
    system = "You are a Principal Cloud Architect. Modify the architecture spec based on the user request. Return exactly the new full JSON matching the original schema."
    user = f"Current Architecture:\n{req.currentArch}\n\nModification Request: {req.prompt}"
    
    raw = await llm.complete(system=system, user=user)
    try:
        import json
        clean_str = raw.replace("```json", "").replace("```", "").strip()
        updated = json.loads(clean_str)
        return {"updatedArchitecture": updated}
    except Exception as e:
        return {"updatedArchitecture": {"error": "Failed to modify", "raw": raw}}

class ExplainArchRequest(BaseModel):
    currentArch: Dict[str, Any]
    question: str

@router.post("/explain")
async def explain_architecture(req: ExplainArchRequest):
    from app.llm.openai_provider import OpenAIProvider
    llm = OpenAIProvider()
    
    system = "You are a Principal Cloud Architect. Explain the reasoning behind a specific part of the provided architecture in a clear, concise paragraph."
    user = f"Architecture:\n{req.currentArch}\n\nQuestion: {req.question}"
    
    explanation = await llm.complete(system=system, user=user)
    return {"explanation": explanation}
