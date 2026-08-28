# Phase 3: Data Ingestion & Knowledge Base — Implementation Plan

## Overview

Enable file uploads, document parsing (PDF, DOCX, MD, images), text chunking, embedding generation, and vector storage in pgvector. After this phase, users can upload documents which are parsed, embedded, and stored in a project's vector knowledge base for RAG queries.

**Key decisions:**
- File uploads: Presigned URLs to MinIO via Go API
- Document parsing: Python (PyPDF2, python-docx, Pillow/OCR)
- Embeddings: OpenAI `text-embedding-3-small` (pluggable via LLM module)
- Vector storage: PostgreSQL + pgvector
- Processing queue: Redis (RQ or Celery)

---

## Module 3.1: File Upload & Storage

### 3.1.1 — Database: Documents & Chunks Tables

**Files to create:**
- `apps/api/migrations/00023_create_documents.sql`

**Schema:**
```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  content_type TEXT NOT NULL, -- 'pdf', 'docx', 'md', 'txt', 'png', 'jpg', 'jpeg'
  storage_path TEXT NOT NULL, -- MinIO object key
  file_size BIGINT NOT NULL,
  processing_status TEXT NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
  extracted_text TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536), -- OpenAI text-embedding-3-small dimension
  token_count INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_documents_project ON documents(project_id);
CREATE INDEX idx_documents_status ON documents(processing_status);
CREATE INDEX idx_document_chunks_project ON document_chunks(project_id);
CREATE INDEX idx_document_chunks_embedding ON document_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

### 3.1.2 — Go File Upload API

**Files to create:**
- `apps/api/internal/projects/files_handler.go` — file upload endpoints
- `apps/api/internal/projects/files_service.go` — file upload business logic
- `apps/api/pkg/storage/minio.go` — update with presigned URL generation

**File upload endpoints:**
```
POST /api/v1/projects/:id/files/presign  — get presigned upload URL
POST /api/v1/projects/:id/files          — confirm upload, create document record
GET  /api/v1/projects/:id/files          — list project files
GET  /api/v1/projects/:id/files/:fileId  — get file metadata
DELETE /api/v1/projects/:id/files/:fileId — delete file
```

**Upload flow:**
1. Client calls `POST /presign` with filename + content type
2. Go generates a presigned MinIO URL (PUT, 15-minute expiry)
3. Client uploads file directly to MinIO using presigned URL
4. Client calls `POST /files` to confirm upload
5. Go creates `documents` record with status `pending`
6. Go enqueues processing job to Redis queue
7. Go returns document metadata

**MinIO bucket setup:**
- Bucket name: `kairopro-uploads`
- Path pattern: `{project_id}/{document_id}/{filename}`
- On startup, Go creates bucket if it doesn't exist

### 3.1.3 — Next.js File Upload UI

**Files to create:**
- `apps/web/app/projects/[projectId]/overview/page.tsx` — update with file upload area
- `apps/web/components/upload/file-upload-zone.tsx` — drag-and-drop upload component
- `apps/web/components/upload/file-list.tsx` — list uploaded files with status
- `apps/web/components/upload/file-progress.tsx` — upload progress indicator
- `apps/web/lib/upload.ts` — presigned URL upload client logic

**Upload UI flow:**
1. User drags files or clicks upload area
2. Frontend requests presigned URL for each file
3. Frontend uploads directly to MinIO
4. Frontend confirms upload via POST /files
5. File list shows processing status (pending → processing → completed/failed)

---

## Module 3.2: Document Processing Pipeline

### 3.2.1 — FastAPI Document Processing

**Files to create:**
- `apps/ai/app/documents/parser.py` — document parser dispatcher
- `apps/ai/app/documents/pdf_parser.py` — PDF extraction (PyPDF2)
- `apps/ai/app/documents/docx_parser.py` — DOCX extraction (python-docx)
- `apps/ai/app/documents/markdown_parser.py` — Markdown extraction
- `apps/ai/app/documents/image_parser.py` — Image OCR (Pillow + pytesseract)
- `apps/ai/app/documents/chunker.py` — text chunking with overlap
- `apps/ai/app/documents/__init__.py` — update with exports

**Parser interface:**
```python
class DocumentParser(ABC):
    @abstractmethod
    async def parse(self, file_path: str) -> ParsedDocument:
        """Extract text, metadata, and structure from document."""
        pass

@dataclass
class ParsedDocument:
    text: str
    sections: list[DocumentSection]
    metadata: dict
    page_count: int | None = None

@dataclass
class DocumentSection:
    title: str | None
    content: str
    page_number: int | None = None
    section_type: str  # "heading", "paragraph", "table", "code", "image"
```

**Chunking strategy:**
- Chunk size: 512 tokens (~2000 characters)
- Overlap: 50 tokens (~200 characters)
- Preserve section boundaries where possible
- Each chunk stores: content, source document, page number, section title

### 3.2.2 — Embedding & Vector Storage

**Files to create:**
- `apps/ai/app/rag/embedder.py` — embedding generation (OpenAI)
- `apps/ai/app/rag/vector_store.py` — pgvector query interface
- `apps/ai/app/rag/retriever.py` — RAG retrieval with relevance scoring
- `apps/ai/app/rag/__init__.py` — update with exports

**Embedding pipeline:**
```python
class Embedder:
    """Generate embeddings using OpenAI text-embedding-3-small."""
    
    async def embed_texts(self, texts: list[str]) -> list[list[float]]:
        """Batch embed multiple texts."""
        pass
    
    async def embed_query(self, query: str) -> list[float]:
        """Embed a single query for retrieval."""
        pass

class VectorStore:
    """Interface to pgvector for similarity search."""
    
    async def store_chunks(self, project_id: str, chunks: list[DocumentChunk]) -> None:
        """Store embedded chunks in pgvector."""
        pass
    
    async def search(self, project_id: str, query_embedding: list[float], limit: int = 10) -> list[SearchResult]:
        """Find most similar chunks to query embedding."""
        pass
    
    async def delete_document_chunks(self, document_id: str) -> None:
        """Remove all chunks for a document."""
        pass
```

### 3.2.3 — Processing Queue Worker

**Files to create:**
- `apps/ai/app/worker.py` — Redis queue worker (RQ)
- `apps/ai/app/tasks.py` — task definitions for document processing
- `apps/ai/app/api/documents.py` — document processing API endpoints

**Processing flow:**
1. Go API enqueues job to Redis: `{ "task": "process_document", "document_id": "...", "project_id": "..." }`
2. FastAPI worker picks up job
3. Worker downloads file from MinIO
4. Worker parses document based on content type
5. Worker chunks extracted text
6. Worker generates embeddings for each chunk
7. Worker stores chunks + embeddings in pgvector
8. Worker updates `documents.processing_status` to `completed` or `failed`

**Document processing endpoints (internal, called by Go):**
```
POST /ai/v1/documents/process    — trigger document processing
GET  /ai/v1/documents/:id/status — get processing status
POST /ai/v1/documents/:id/reprocess — reprocess failed document
DELETE /ai/v1/documents/:id      — delete document and chunks
```

### 3.2.4 — Go → FastAPI Communication

**Files to create:**
- `apps/api/pkg/queue/redis.go` — update with job enqueue logic
- `apps/api/internal/ai/client.go` — HTTP client for calling FastAPI

**Communication pattern:**
- Go → Redis queue: enqueue processing jobs
- Go → FastAPI HTTP: synchronous calls for status checks
- FastAPI → Go: callback webhook when processing completes (or Go polls status)

### 3.2.5 — Knowledge Base Query API

**Files to create:**
- `apps/api/internal/projects/kb_handler.go` — knowledge base query endpoints
- `apps/api/internal/projects/kb_service.go` — knowledge base business logic

**Knowledge base endpoints:**
```
POST /api/v1/projects/:id/knowledge/search  — search project knowledge base
GET  /api/v1/projects/:id/knowledge/stats   — get knowledge base statistics
GET  /api/v1/projects/:id/knowledge         — list all knowledge entries
```

**Search request:**
```json
{
  "query": "authentication requirements",
  "limit": 10,
  "min_confidence": 0.7,
  "content_types": ["pdf", "docx"]
}
```

**Search response:**
```json
{
  "results": [
    {
      "chunk_id": "...",
      "document_id": "...",
      "document_filename": "PRD.pdf",
      "content": "Users must authenticate via email/password...",
      "score": 0.92,
      "metadata": { "page": 5, "section": "Authentication" }
    }
  ]
}
```

---

## TypeScript Types & Schemas

**Files to create/modify:**
- `packages/types/src/document.ts` — Document, DocumentChunk, UploadRequest, UploadResponse
- `packages/types/src/knowledge-base.ts` — SearchRequest, SearchResult, KnowledgeStats
- `packages/schemas/document.schema.json` — document upload/processing schemas
- `packages/schemas/knowledge-base.schema.json` — knowledge base search schemas

---

## OpenAPI Spec Updates

**Files to modify:**
- `apps/api/api-spec.yaml` — add file upload, knowledge base endpoints
- `apps/ai/api-spec.yaml` — add document processing endpoints

---

## Docker Compose Updates

**Files to modify:**
- `docker-compose.yml` — add FastAPI worker service

**New service:**
```yaml
ai-worker:
  build: ./apps/ai
  command: python -m app.worker
  depends_on: [redis, postgres, minio]
  env_file: .env
```

---

## Verification Steps

1. **File upload:** Upload a PDF via presigned URL → file appears in MinIO console → document record created
2. **Processing:** Document status transitions from `pending` → `processing` → `completed`
3. **Parsing:** Upload PDF, DOCX, MD, PNG → each extracts text correctly
4. **Chunking:** Document is split into ~512-token chunks with overlap
5. **Embedding:** Chunks have embeddings stored in pgvector
6. **Search:** Query knowledge base → returns relevant chunks with confidence scores
7. **UI:** Upload file in dashboard → see processing status → search knowledge base
8. **Error handling:** Upload unsupported file type → 400 error; processing failure → status `failed`, can reprocess

---

## Implementation Order

1. Database migrations (documents, document_chunks tables)
2. Go file upload API (presigned URLs, CRUD)
3. Next.js file upload UI (drag-and-drop, progress, status)
4. FastAPI document parsers (PDF, DOCX, MD, image)
5. FastAPI chunking + embedding pipeline
6. FastAPI processing worker (RQ)
7. Go → FastAPI communication (Redis queue + HTTP client)
8. Knowledge base query API
9. TypeScript types + JSON schemas
10. OpenAPI spec updates
11. Docker Compose worker service
12. End-to-end verification