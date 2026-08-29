import json
import os
import redis.asyncio as redis
from abc import ABC, abstractmethod
from typing import Optional, Dict, Any, List
from pydantic import BaseModel

from app.llm.provider import LLMProvider
from app.rag.embedder import Embedder
from app.rag.vector_store import VectorStore

class AgentContext(BaseModel):
    project_id: str
    run_id: str
    input_data: Dict[str, Any]
    # For requirement agent
    problem_statement: Optional[str] = None
    # For PRD agent
    locked_requirements: Optional[List[Dict[str, Any]]] = None

class AgentResult(BaseModel):
    stateTransition: str
    data: Dict[str, Any] = {}

class BaseAgent(ABC):
    def __init__(self, llm: LLMProvider):
        self.llm = llm
        self.redis = redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379"))

    async def emit_event(self, run_id: str, event_type: str, data: dict):
        """Publish to Redis channel, Next.js SSE route subscribes."""
        payload = json.dumps({"runId": run_id, "type": event_type, "data": data})
        await self.redis.publish(f"project-events:{run_id}", payload)

    async def search_knowledge(self, project_id: str, query: str) -> str:
        """Helper to query the project's knowledge base."""
        embedder = Embedder()
        store = VectorStore()
        
        try:
            query_emb = await embedder.embed_query(query)
            results = await store.search(project_id, query_emb, limit=5)
            
            # Combine content
            context_text = "\n\n---\n\n".join(
                [f"Document: {r['documentFilename']}\nContent: {r['content']}" for r in results]
            )
            return context_text
        except Exception as e:
            print(f"Knowledge search failed: {e}")
            return "No additional context available."

    @abstractmethod
    async def run(self, context: AgentContext) -> AgentResult:
        pass
