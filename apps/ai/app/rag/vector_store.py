import os
import json
import psycopg
from pgvector.psycopg import register_vector
from app.documents.chunker import EmbeddedChunk
from typing import List, Dict, Any

class VectorStore:
    def __init__(self):
        self.db_url = os.getenv("DATABASE_URL")
        
    async def get_connection(self):
        # We use psycopg 3 async connection
        conn = await psycopg.AsyncConnection.connect(self.db_url)
        # Register pgvector types
        await register_vector(conn)
        return conn

    async def store_chunks(self, project_id: str, doc_id: str, chunks: List[EmbeddedChunk]) -> None:
        async with await self.get_connection() as conn:
            async with conn.cursor() as cur:
                for chunk in chunks:
                    await cur.execute(
                        """
                        INSERT INTO "DocumentChunk" (
                            id, "documentId", "projectId", "chunkIndex", 
                            content, "tokenCount", metadata, embedding, "createdAt"
                        )
                        VALUES (
                            gen_random_uuid(), %s, %s, %s, %s, %s, %s, %s, NOW()
                        )
                        """,
                        (
                            doc_id, 
                            project_id, 
                            chunk.chunk_index, 
                            chunk.content, 
                            chunk.token_count,
                            json.dumps(chunk.metadata),
                            chunk.embedding
                        )
                    )
            await conn.commit()

    async def search(self, project_id: str, query_embedding: List[float], limit: int = 10) -> List[Dict[str, Any]]:
        async with await self.get_connection() as conn:
            async with conn.cursor() as cur:
                # Cosine distance: <=>
                await cur.execute(
                    """
                    SELECT 
                        c.id, c."documentId", d.filename, c.content, 
                        c.metadata, 1 - (c.embedding <=> %s::vector) as score
                    FROM "DocumentChunk" c
                    JOIN "Document" d ON c."documentId" = d.id
                    WHERE c."projectId" = %s
                    ORDER BY c.embedding <=> %s::vector
                    LIMIT %s
                    """,
                    (query_embedding, project_id, query_embedding, limit)
                )
                
                results = await cur.fetchall()
                
                return [
                    {
                        "chunkId": row[0],
                        "documentId": row[1],
                        "documentFilename": row[2],
                        "content": row[3],
                        "metadata": row[4],
                        "score": float(row[5])
                    }
                    for row in results
                ]
