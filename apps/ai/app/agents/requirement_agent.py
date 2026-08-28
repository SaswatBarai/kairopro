"""Requirement agent stub — full implementation in Phase 4."""
from app.agents.base_agent import BaseAgent, AgentContext, AgentResult


class RequirementAgent(BaseAgent):
    async def run(self, context: AgentContext) -> AgentResult:
        return AgentResult(state_transition="stub")
