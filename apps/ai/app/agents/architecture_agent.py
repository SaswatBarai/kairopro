import json
from app.agents.base_agent import BaseAgent, AgentContext, AgentResult

ARCH_PROMPT = """
You are a Principal Cloud Architect.
Based on the PRD and the selected Design Spec, generate a structured technical architecture.

Output JSON matching this exact structure:
{
  "techStack": {
    "frontend": { "framework": "...", "language": "...", "uiLibrary": "..." },
    "backend": { "framework": "...", "orm": "...", "auth": "..." },
    "aiEngine": { "framework": "...", "language": "..." },
    "database": { "engine": "...", "extensions": ["..."] },
    "infrastructure": { "containerization": "...", "runtime": "...", "storage": "...", "cache": "..." }
  },
  "frontend": {
    "pages": [
      { "path": "...", "component": "...", "auth": true }
    ]
  },
  "backend": {
    "apiRoutes": [
      { "method": "...", "path": "...", "description": "..." }
    ]
  },
  "database": {
    "prismaModels": ["...", "..."],
    "relationships": ["..."]
  },
  "integrations": {
    "auth": "...",
    "storage": "...",
    "email": "...",
    "queue": "..."
  }
}
"""

class ArchitectureAgent(BaseAgent):
    async def run(self, context: AgentContext) -> AgentResult:
        prd_data = context.inputs.get("prd", "No PRD provided")
        design_data = context.inputs.get("design", "No Design provided")
        
        await self.emit_event(
            context.run_id, 
            "agent.thinking", 
            {"step": "Analyzing PRD and Design to construct architecture..."}
        )
        
        user_msg = f"PRD Context:\n{json.dumps(prd_data)}\n\nDesign Context:\n{json.dumps(design_data)}\n\nGenerate the architecture JSON spec:"
        
        raw_response = await self.llm.complete(system=ARCH_PROMPT, user=user_msg)
        
        if isinstance(raw_response, str):
            try:
                clean_str = raw_response.replace("```json", "").replace("```", "").strip()
                arch_spec = json.loads(clean_str)
            except Exception:
                arch_spec = {"error": "Failed to parse JSON", "raw": raw_response}
        else:
            arch_spec = raw_response

        await self.emit_event(
            context.run_id, 
            "agent.completed", 
            {"architecture": arch_spec}
        )

        return AgentResult(
            status="completed",
            output={"architecture": arch_spec},
            stateTransition="architecture_ready"
        )
