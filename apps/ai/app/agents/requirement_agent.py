from typing import List, Optional, Any
from pydantic import BaseModel, Field

from app.agents.base_agent import BaseAgent, AgentContext, AgentResult

class ExtractedRequirement(BaseModel):
    title: str = Field(description="Short, descriptive title for the requirement")
    description: str = Field(description="Detailed explanation of the requirement")
    category: str = Field(description="One of: business, functional, non_functional, ui, security, data, integration")
    priority: str = Field(description="One of: critical, high, medium, low")
    confidence: float = Field(description="Score from 0.0 to 1.0 indicating AI's confidence in this requirement")
    clarificationQuestion: Optional[str] = Field(description="If confidence < 0.7, a specific question for the user to clarify this requirement", default=None)

class RequirementExtractionResponse(BaseModel):
    requirements: List[ExtractedRequirement]

REQUIREMENT_EXTRACTION_PROMPT = """
You are an expert Product Manager and Systems Architect.
Analyze the user's problem statement and the provided context from their uploaded documents.

Extract a comprehensive list of requirements across multiple categories (functional, non-functional, security, data, etc.).
Assign a priority (critical, high, medium, low) and a confidence score (0.0 to 1.0) to each requirement.
For any requirement where you are guessing or missing key information (confidence < 0.7), provide a specific `clarificationQuestion` to ask the user.
"""

class RequirementAgent(BaseAgent):
    async def run(self, context: AgentContext) -> AgentResult:
        await self.emit_event(context.run_id, "agent.thinking", {"step": "Retrieving context from knowledge base"})

        problem_statement = context.problem_statement or context.input_data.get("problem_statement", "")
        
        # 1. Search knowledge base
        knowledge = await self.search_knowledge(context.project_id, problem_statement)

        await self.emit_event(context.run_id, "agent.thinking", {"step": "Extracting requirements"})

        # 2. Extract requirements via LLM
        prompt = f"Problem Statement: {problem_statement}\n\nContext:\n{knowledge}"
        
        response: RequirementExtractionResponse = await self.llm.complete(
            system=REQUIREMENT_EXTRACTION_PROMPT,
            user=prompt,
            response_model=RequirementExtractionResponse,
        )

        requirements = response.requirements
        clarifications = [r for r in requirements if r.confidence < 0.7]

        state = "clarification" if clarifications else "prd_ready"

        await self.emit_event(context.run_id, "agent.thinking", {"step": "Requirement extraction complete"})

        return AgentResult(
            stateTransition=state,
            data={
                "requirements": [r.model_dump() for r in requirements]
            }
        )
