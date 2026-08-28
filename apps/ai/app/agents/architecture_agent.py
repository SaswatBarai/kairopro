"""Architecture agent stub — full implementation in Phase 5."""
from app.agents.base_agent import BaseAgent, AgentContext, AgentResult


class ArchitectureAgent(BaseAgent):
    async def run(self, context: AgentContext) -> AgentResult:
        return AgentResult(state_transition="stub")
