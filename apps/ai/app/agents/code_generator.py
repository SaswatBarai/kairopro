import json
from app.agents.base_agent import BaseAgent, AgentContext, AgentResult

CODER_PROMPT = """
You are a 10x Staff Engineer.
Implement the code for the following task based on the provided architecture.
Return exactly ONE JSON array of objects representing the files you created or modified.

Structure:
[
  {
    "action": "created",
    "path": "apps/web/app/api/route.ts",
    "content": "export function GET() { ... }"
  }
]
"""

class CodeGenerator(BaseAgent):
    async def run(self, context: AgentContext) -> AgentResult:
        task = context.inputs.get("task")
        arch = context.inputs.get("architecture")
        
        user_msg = f"Task: {json.dumps(task)}\n\nArchitecture Context:\n{json.dumps(arch)}"
        
        raw = await self.llm.complete(system=CODER_PROMPT, user=user_msg)
        
        if isinstance(raw, str):
            clean_str = raw.replace("```json", "").replace("```", "").strip()
            files = json.loads(clean_str)
        else:
            files = raw
            
        return AgentResult(status="completed", output={"files": files})
