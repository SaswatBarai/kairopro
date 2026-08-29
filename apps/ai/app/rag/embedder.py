import os
import httpx
from typing import List

class Embedder:
    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY")
        self.model = "text-embedding-3-small"
        self.base_url = "https://api.openai.com/v1/embeddings"
        
    async def embed_texts(self, texts: List[str]) -> List[List[float]]:
        if not self.api_key:
            # Fallback for dev mode without OpenAI key - generate random vectors
            import random
            return [[random.random() for _ in range(1536)] for _ in texts]
            
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
                timeout=60.0
            )
            
            if response.status_code != 200:
                raise Exception(f"OpenAI embedding failed: {response.text}")
                
            data = response.json()
            return [item["embedding"] for item in data["data"]]
            
    async def embed_query(self, query: str) -> List[float]:
        results = await self.embed_texts([query])
        return results[0]
