import json
from app.agents.base_agent import BaseAgent, AgentContext, AgentResult
from app.agents.platform_client import PlatformClient
import os

DEBUG_PROMPT = """
You are a Senior Backend Engineer.
A test/build failed. Analyze the error output and return a JSON array of file changes to fix the issue.

Structure:
[
  {
    "action": "modified",
    "path": "apps/web/package.json",
    "content": "..."
  }
]
"""

class DebuggingAgent(BaseAgent):
    MAX_ITERATIONS = 3 # Keeping small for demo purposes

    def __init__(self, llm_provider, platform_client=None):
        super().__init__(llm_provider)
        self.platform = platform_client or PlatformClient(
            base_url=os.getenv("PLATFORM_URL", "http://localhost:3000"),
            service_token=os.getenv("SERVICE_TOKEN", "development_secret_token")
        )

    async def run(self, context: AgentContext) -> AgentResult:
        failures = context.inputs.get("failures", [])
        
        for i in range(self.MAX_ITERATIONS):
            await self.emit_event(context.run_id, "agent.thinking", {"step": f"Debug iteration {i+1}/{self.MAX_ITERATIONS}"})
            
            user_msg = f"Errors:\n{json.dumps(failures)}"
            
            raw = await self.llm.complete(system=DEBUG_PROMPT, user=user_msg)
            
            if isinstance(raw, str):
                try:
                    clean = raw.replace("```json", "").replace("```", "").strip()
                    fix = json.loads(clean)
                except Exception:
                    fix = []
            else:
                fix = raw

            if fix:
                formatted_files = [{"action": f.get("action", "modified"), "filePath": f.get("path"), "contentAfter": f.get("content")} for f in fix]
                await self.platform.write_files(context.project_id, formatted_files)
                await self.emit_event(context.run_id, "debug.iteration", {"attempt": i+1, "fixes": len(fix)})

            # Re-run test
            test_res = await self.platform.exec_command(context.project_id, ["npm", "run", "build"])
            if test_res["exit_code"] == 0:
                await self.emit_event(context.run_id, "test.passed", {"message": "Debug successful"})
                return AgentResult(status="completed", stateTransition="preview")
            else:
                failures = [test_res] # Update failures for next iteration

        return AgentResult(
            status="failed",
            stateTransition="failed",
            output={"message": "Max debug iterations reached. Manual intervention required."}
        )
