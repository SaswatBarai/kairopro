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
from app.agents.developer_agent import DeveloperAgent
from app.agents.testing_agent import TestingAgent
from app.agents.debug_agent import DebuggingAgent
from app.config import settings

class Orchestrator:
    def __init__(self):
        self.db_url = settings.DATABASE_URL
        self.llm_provider = OpenAIProvider()
        
        self.agents = {
            "requirement": RequirementAgent(self.llm_provider),
            "prd": PRDAgent(self.llm_provider),
            "design": DesignAgent(self.llm_provider),
            "architecture": ArchitectureAgent(self.llm_provider),
            "developer": DeveloperAgent(self.llm_provider),
            "testing": TestingAgent(self.llm_provider),
            "debugging": DebuggingAgent(self.llm_provider),
        }

    async def get_connection(self):
        return await psycopg.AsyncConnection.connect(self.db_url)

    async def run_agent(self, project_id: str, run_id: str, agent_type: str, input_data: dict) -> AgentResult:
        agent = self.agents.get(agent_type)
        if not agent:
            raise ValueError(f"Unknown agent type: {agent_type}")
            
        context = AgentContext(
            project_id=project_id,
            run_id=run_id,
            input_data=input_data,
            problem_statement=input_data.get("problem_statement")
        )
        
        try:
            await agent.emit_event(run_id, "agent.started", {"agent_type": agent_type})
            
            # Execute
            result = await agent.run(context)
            
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
                    
                    # Store extracted requirements in DB
                    if agent_type == "requirement" and "requirements" in result.data:
                        for req in result.data["requirements"]:
                            await cur.execute(
                                """
                                INSERT INTO "Requirement" (
                                    id, "projectId", title, description, category, 
                                    priority, confidence, source, status, 
                                    "clarificationQuestion", "createdAt", "updatedAt"
                                )
                                VALUES (
                                    gen_random_uuid(), %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW()
                                )
                                """,
                                (
                                    project_id,
                                    req.get("title", "Requirement"),
                                    req.get("description", ""),
                                    req.get("category", "functional"),
                                    req.get("priority", "medium"),
                                    float(req.get("confidence", 0.8)),
                                    "ai_inference",
                                    "locked" if req.get("confidence", 1) >= 0.7 else "clarifying",
                                    req.get("clarificationQuestion")
                                )
                            )

                    # Store PRD Version in DB
                    if agent_type == "prd" and "prd" in result.data:
                        prd_data = result.data["prd"]
                        await cur.execute(
                            'SELECT COALESCE(MAX(version), 0) + 1 FROM "PRDVersion" WHERE "projectId" = %s',
                            (project_id,)
                        )
                        res = await cur.fetchone()
                        next_ver = res[0] if res else 1

                        title = prd_data.get("title", "Product Requirements Document")
                        markdown = f"# {title}\n\n## Overview\n{prd_data.get('overview', {}).get('problem', '')}\n\n## Features\n"
                        for feat in prd_data.get("features", []):
                            markdown += f"### {feat.get('title')}\n{feat.get('userStory')}\n\n"

                        await cur.execute(
                            """
                            INSERT INTO "PRDVersion" (
                                id, "projectId", version, content, "contentMarkdown", "generatedBy", "createdAt"
                            )
                            VALUES (
                                gen_random_uuid(), %s, %s, %s, %s, %s, NOW()
                            )
                            """,
                            (project_id, next_ver, json.dumps(prd_data), markdown, "ai")
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
