"""Agent stubs — full implementations in Phases 4–7."""
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any


@dataclass
class AgentContext:
    project_id: str
    run_id: str
    problem_statement: str = ""
    approved_prd: dict | None = None
    approved_design: dict | None = None
    architecture: dict | None = None
    locked_requirements: list[dict] | None = None
    test_failures: list[dict] | None = None


@dataclass
class AgentResult:
    state_transition: str
    data: dict | None = None
    error: str | None = None


class BaseAgent(ABC):
    """Abstract base class for all KairoPro AI agents."""

    def __init__(self, llm_provider: Any = None):
        self.llm = llm_provider

    @abstractmethod
    async def run(self, context: AgentContext) -> AgentResult:
        """Execute the agent's task."""
        ...

    async def emit_event(self, run_id: str, event_type: str, data: dict):
        """Publish event to Redis — Next.js SSE stream picks it up."""
        # Implemented fully in Phase 4
        pass
