from app.agents.base_agent import BaseAgent, AgentContext, AgentResult
from app.agents.platform_client import PlatformClient
import os

class TestingAgent(BaseAgent):
    def __init__(self, llm_provider, platform_client=None):
        super().__init__(llm_provider)
        self.platform = platform_client or PlatformClient(
            base_url=os.getenv("PLATFORM_URL", "http://localhost:3000"),
            service_token=os.getenv("SERVICE_TOKEN", "development_secret_token")
        )

    async def run(self, context: AgentContext) -> AgentResult:
        # Simplistic approach: Run 'npm test' or 'npm run build' depending on stack
        test_commands = [["npm", "run", "build"]] # Add 'npm test' if test suite exists
        
        results = []
        for cmd in test_commands:
            await self.emit_event(context.run_id, "test.started", {"command": " ".join(cmd)})
            
            try:
                result = await self.platform.exec_command(context.project_id, cmd)
                passed = result["exit_code"] == 0
                event_name = "test.passed" if passed else "test.failed"
                
                await self.emit_event(context.run_id, event_name, {"output": result["stdout"] + "\n" + result["stderr"]})
                results.append(result)
            except Exception as e:
                results.append({"exit_code": 1, "stderr": str(e), "stdout": ""})

        if all(r.get("exit_code") == 0 for r in results):
            return AgentResult(status="completed", stateTransition="preview")
            
        return AgentResult(status="completed", stateTransition="debugging", output={"failures": results})
