import os
import httpx
import random
from typing import List

class Embedder:
    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY", "")
        self.model = "text-embedding-3-small"
        self.base_url = "https://api.openai.com/v1/embeddings"
        
    async def embed_texts(self, texts: List[str]) -> List[List[float]]:
        if not self.api_key or self.api_key == "dummy-key-for-dev" or "deepseek" in os.getenv("OPENAI_BASE_URL", "").lower():
            # Dev mode fallback or non-OpenAI embedding provider fallback
            return [[random.random() for _ in range(1536)] for _ in texts]
            
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.base_url,
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": self.model,
                        "input": texts
                    },
                    timeout=10.0
                )
                
                if response.status_code != 200:
                    return [[random.random() for _ in range(1536)] for _ in texts]
                    
                data = response.json()
                return [item["embedding"] for item in data["data"]]
        except Exception:
            return [[random.random() for _ in range(1536)] for _ in texts]
            
    async def embed_query(self, query: str) -> List[float]:
        results = await self.embed_texts([query or ""])
        return results[0]
