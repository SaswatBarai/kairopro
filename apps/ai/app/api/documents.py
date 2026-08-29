import os
import boto3
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel

from app.documents.parser import ParserFactory
from app.documents.chunker import DocumentChunker
from app.rag.embedder import Embedder
from app.rag.vector_store import VectorStore

router = APIRouter()

class ProcessDocumentRequest(BaseModel):
    documentId: str
    projectId: str

class SearchRequest(BaseModel):
    projectId: str
    query: str
    limit: int = 10

def get_s3_client():
    if os.getenv("NODE_ENV") == "production":
        return boto3.client('s3', region_name=os.getenv("AWS_REGION", "us-east-1"))
    
    return boto3.client(
        's3',
        endpoint_url=os.getenv("MINIO_ENDPOINT", "http://localhost:9000"),
        aws_access_key_id=os.getenv("MINIO_ACCESS_KEY", "minioadmin"),
        aws_secret_access_key=os.getenv("MINIO_SECRET_KEY", "minioadmin"),
        region_name=os.getenv("AWS_REGION", "us-east-1")
    )

@router.post("/documents/process")
async def process_document(req: ProcessDocumentRequest):
    """
    1. Downloads file from MinIO (we need to know objectKey, so we'll query DB or fetch via MinIO)
    Actually, we should fetch objectKey from Prisma, but we can access Postgres directly here to get the Document record.
    """
    import psycopg
    from psycopg.rows import dict_row
    
    db_url = os.getenv("DATABASE_URL")
    
    # Get document metadata from DB
    async with await psycopg.AsyncConnection.connect(db_url) as conn:
        async with conn.cursor(row_factory=dict_row) as cur:
            await cur.execute('SELECT * FROM "Document" WHERE id = %s', (req.documentId,))
            doc = await cur.fetchone()
            
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    object_key = doc["storagePath"]
    filename = doc["filename"]
    content_type = doc["contentType"]
    bucket = os.getenv("MINIO_BUCKET", "kairopro")
    
    # Download from MinIO
    s3 = get_s3_client()
    try:
        s3_obj = s3.get_object(Bucket=bucket, Key=object_key)
        content = s3_obj['Body'].read()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch from storage: {str(e)}")
        
    # 1. Parse
    parser = ParserFactory.get_parser(filename, content_type)
    parsed_doc = await parser.parse(content, filename)
    
    # 2. Chunk
    chunker = DocumentChunker()
    chunks = chunker.chunk_document(parsed_doc)
    
    # 3. Embed
    embedder = Embedder()
    texts = [chunk.content for chunk in chunks]
    embeddings = await embedder.embed_texts(texts)
    
    for i, chunk in enumerate(chunks):
        chunk.embedding = embeddings[i]
        
    # 4. Store in pgvector
    store = VectorStore()
    await store.store_chunks(req.projectId, req.documentId, chunks)
    
    return {"success": True, "chunks_processed": len(chunks)}

@router.post("/search")
async def search_knowledge(req: SearchRequest):
    embedder = Embedder()
    query_embedding = await embedder.embed_query(req.query)
    
    store = VectorStore()
    results = await store.search(req.projectId, query_embedding, req.limit)
    
    return {"results": results}
