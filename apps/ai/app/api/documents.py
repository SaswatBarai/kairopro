"""Document processing router — stub for Phase 3."""
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class ProcessRequest(BaseModel):
    documentId: str
    projectId: str


class SearchRequest(BaseModel):
    projectId: str
    query: str
    limit: int = 10


@router.post("/documents/process")
async def process_document(body: ProcessRequest):
    """Parse, chunk, embed, and store document. Phase 3."""
    return {"status": "stub", "message": f"Document processing stub for {body.documentId}."}


@router.get("/documents/{document_id}/status")
async def get_document_status(document_id: str):
    return {"status": "stub", "documentId": document_id}


@router.post("/search")
async def search_knowledge(body: SearchRequest):
    """Semantic search over project knowledge base. Phase 3."""
    return {"status": "stub", "results": [], "message": "Knowledge search stub."}
