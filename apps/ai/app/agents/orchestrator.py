import os
import json
import psycopg
from psycopg.rows import dict_row

from app.llm.openai_provider import OpenAIProvider
from app.agents.base_agent import AgentContext, AgentResult
from app.agents.requirement_agent import RequirementAgent
from app.agents.prd_agent import PRDAgent
from app.agents.design_agent import DesignAgent
from app.agents.architecture_agent import ArchitectureAgent

class Orchestrator:
    def __init__(self):
        self.db_url = os.getenv("DATABASE_URL")
        self.llm_provider = OpenAIProvider()
        
        self.agents = {
            "requirement": RequirementAgent(self.llm_provider),
            "prd": PRDAgent(self.llm_provider),
            "design": DesignAgent(self.llm_provider),
            "architecture": ArchitectureAgent(self.llm_provider),
        }

    async def get_connection(self):
        return await psycopg.AsyncConnection.connect(self.db_url)

    async def run_agent(self, project_id: str, run_id: str, agent_type: str, input_data: dict) -> AgentResult:
        agent = self.agents.get(agent_type)
        if not agent:
            raise ValueError(f"Unknown agent type: {agent_type}")
            
        # Create context
        context = AgentContext(
            project_id=project_id,
            run_id=run_id,
            input_data=input_data,
            problem_statement=input_data.get("problem_statement")
        )
        
        try:
            # Emit start event
            await agent.emit_event(run_id, "agent.started", {"agent_type": agent_type})
            
            # Execute
            result = await agent.run(context)
            
            # Update run status to completed and store output
            async with await self.get_connection() as conn:
                async with conn.cursor() as cur:
                    await cur.execute(
                        """
                        UPDATE "AgentRun" 
                        SET status = 'completed', output = %s, "completedAt" = NOW()
                        WHERE id = %s
                        """,
                        (json.dumps(result.model_dump()), run_id)
                    )
                    
                    # Update project state if requested
                    if result.stateTransition:
                        await cur.execute(
                            'UPDATE "Project" SET state = %s WHERE id = %s',
                            (result.stateTransition, project_id)
                        )
                await conn.commit()
            
            await agent.emit_event(run_id, "agent.completed", {"result": result.model_dump()})
            return result
            
        except Exception as e:
            # Mark as failed
            async with await self.get_connection() as conn:
                async with conn.cursor() as cur:
                    await cur.execute(
                        """
                        UPDATE "AgentRun" 
                        SET status = 'failed', error = %s, "completedAt" = NOW()
                        WHERE id = %s
                        """,
                        (str(e), run_id)
                    )
                await conn.commit()
                
            await agent.emit_event(run_id, "agent.error", {"error": str(e)})
            raise e
