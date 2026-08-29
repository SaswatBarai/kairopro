import json
from app.agents.base_agent import BaseAgent, AgentContext, AgentResult

PLANNER_PROMPT = """
You are a Senior Technical Project Manager.
Based on the Architecture Spec, PRD, and Design, generate a list of implementation tasks in topological order (dependencies first).

Task Types allowed: configuration, database, backend, frontend, testing.
Order must be:
1. configuration (setup, env, config)
2. database (prisma schemas, models)
3. backend (api routes, services)
4. frontend (pages, ui components)

Output strictly JSON matching this array structure:
[
  {
    "title": "Task Name",
    "description": "Details of what to do",
    "taskType": "backend",
    "orderIndex": 1
  }
]
"""

class TaskPlanner(BaseAgent):
    async def run(self, context: AgentContext) -> AgentResult:
        arch = context.inputs.get("architecture")
        
        await self.emit_event(context.run_id, "agent.thinking", {"step": "Planning task graph..."})
        
        user_msg = f"Architecture:\n{json.dumps(arch)}"
        
        raw = await self.llm.complete(system=PLANNER_PROMPT, user=user_msg)
        
        if isinstance(raw, str):
            clean_str = raw.replace("```json", "").replace("```", "").strip()
            tasks = json.loads(clean_str)
        else:
            tasks = raw
            
        return AgentResult(status="completed", output={"tasks": tasks})
