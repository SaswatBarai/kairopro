"""Developer agent stub — full implementation in Phase 7."""
from app.agents.base_agent import BaseAgent, AgentContext, AgentResult


class DeveloperAgent(BaseAgent):
    async def run(self, context: AgentContext) -> AgentResult:
        return AgentResult(state_transition="stub")
