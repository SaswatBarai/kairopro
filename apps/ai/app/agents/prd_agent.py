"""PRD agent stub — full implementation in Phase 4."""
from app.agents.base_agent import BaseAgent, AgentContext, AgentResult


class PRDAgent(BaseAgent):
    async def run(self, context: AgentContext) -> AgentResult:
        return AgentResult(state_transition="stub")
