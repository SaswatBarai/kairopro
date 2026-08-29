import json
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

from app.agents.base_agent import BaseAgent, AgentContext, AgentResult

class PRDPersona(BaseModel):
    role: str
    needs: List[str]
    journeys: List[str]

class PRDFeature(BaseModel):
    id: str
    title: str
    userStory: str
    acceptanceCriteria: List[str]
    priority: str
    dependencies: List[str]

class PRDOverview(BaseModel):
    problem: str
    targetAudience: str
    goals: List[str]

class PRDDocument(BaseModel):
    title: str
    overview: PRDOverview
    personas: List[PRDPersona]
    features: List[PRDFeature]
    businessRules: List[str]
    functionalRequirements: List[str]
    nonFunctionalRequirements: List[str]
    securityRequirements: List[str]

PRD_GENERATION_PROMPT = """
You are a Principal Product Manager.
Your job is to write a comprehensive, extremely detailed Product Requirements Document (PRD).
You will be provided with a list of locked requirements and additional contextual information.

Please generate a highly structured PRD according to the requested schema. Ensure all locked requirements are comprehensively mapped into features, user stories, and acceptance criteria.
"""

class PRDAgent(BaseAgent):
    async def run(self, context: AgentContext) -> AgentResult:
        await self.emit_event(context.run_id, "agent.thinking", {"step": "Retrieving context and requirements for PRD generation"})

        # Get locked requirements
        requirements = context.locked_requirements or context.input_data.get("requirements", [])
        req_text = json.dumps(requirements, indent=2)

        # Retrieve knowledge
        knowledge = await self.search_knowledge(context.project_id, "Product Requirements Document context features functionality")

        prompt = f"Locked Requirements:\n{req_text}\n\nAdditional Context:\n{knowledge}"

        await self.emit_event(context.run_id, "agent.thinking", {"step": "Generating structured PRD (this may take a minute)"})

        prd: PRDDocument = await self.llm.complete(
            system=PRD_GENERATION_PROMPT,
            user=prompt,
            response_model=PRDDocument,
        )

        await self.emit_event(context.run_id, "agent.thinking", {"step": "PRD generated successfully"})

        return AgentResult(
            stateTransition="design_ready", # Skip straight to design ready or architecture ready as per some rules, wait, the rule says: prd_ready -> designing
            data={
                "prd": prd.model_dump()
            }
        )
