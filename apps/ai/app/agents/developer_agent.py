from app.agents.base_agent import BaseAgent, AgentContext, AgentResult
from app.agents.task_planner import TaskPlanner
from app.agents.code_generator import CodeGenerator
from app.agents.platform_client import PlatformClient
import os

class DeveloperAgent(BaseAgent):
    def __init__(self, llm_provider, platform_client=None):
        super().__init__(llm_provider)
        self.platform = platform_client or PlatformClient(
            base_url=os.getenv("PLATFORM_URL", "http://localhost:3000"),
            service_token=os.getenv("SERVICE_TOKEN", "development_secret_token")
        )
        self.planner = TaskPlanner(llm_provider)
        self.coder = CodeGenerator(llm_provider)

    async def run(self, context: AgentContext) -> AgentResult:
        await self.emit_event(context.run_id, "agent.started", {"role": "developer"})
        
        # 1. Plan task graph
        plan_result = await self.planner.run(context)
        tasks = plan_result.output.get("tasks", [])
        
        await self.platform.store_tasks(context.project_id, tasks)
        await self.emit_event(context.run_id, "agent.thinking", {"step": f"Created {len(tasks)} tasks"})

        # 2. Execute in order
        for idx, task in enumerate(tasks):
            await self.emit_event(context.run_id, "agent.thinking", {"step": f"Executing task: {task.get('title')}"})
            
            # Generate code
            ctx = AgentContext(project_id=context.project_id, run_id=context.run_id, input_data={"task": task, "architecture": context.inputs.get("architecture")})
            code_result = await self.coder.run(ctx)
            files = code_result.output.get("files", [])
            
            if files:
                # Format for Next.js API
                formatted_files = []
                for f in files:
                    formatted_files.append({
                        "action": f.get("action", "modified"),
                        "filePath": f.get("path"),
                        "contentAfter": f.get("content")
                    })
                
                # Mock task ID for now since we just stored them via API, 
                # a true implementation would map IDs from API response.
                task_id = f"task-{idx}" 
                
                try:
                    cs_id = await self.platform.create_change_set(context.project_id, task_id, formatted_files)
                    await self.platform.write_files(context.project_id, formatted_files)
                    await self.emit_event(context.run_id, "file.created", {"files_count": len(files)})
                except Exception as e:
                    print("Error storing changes:", e)

        return AgentResult(
            status="completed",
            stateTransition="testing"
        )
