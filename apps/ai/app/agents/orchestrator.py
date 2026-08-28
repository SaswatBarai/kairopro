"""Orchestrator stub — full implementation in Phase 4."""
from app.agents.base_agent import AgentContext, AgentResult


class Orchestrator:
    """Manages agent lifecycle and project state transitions. Phase 4."""

    async def start_analysis(self, project_id: str, run_id: str) -> AgentResult:
        return AgentResult(state_transition="stub", data={"message": "Phase 4"})
