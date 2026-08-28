# Phase 3: Data Ingestion & Knowledge Base — Implementation Plan

## Overview

Enable file uploads via Next.js API routes, process documents in FastAPI workers, embed content, and store in pgvector. After this phase, users can upload documents which are parsed, embedded, and stored in a project's vector knowledge base.

**Key decisions:**
- File uploads: Presigned URLs via **Next.js API route** → MinIO/S3
- Job queue: **BullMQ** (Redis) — Next.js enqueues, FastAPI worker consumes
- Document parsing: **FastAPI** (PyPDF2, python-docx, pytesseract)
- Embeddings: OpenAI `text-embedding-3-small` (pluggable)
- Vector storage: PostgreSQL + pgvector

---

## Module 3.1: File Upload & Storage

### 3.1.1 — Prisma Schema: Documents

**File to update:** `apps/web/prisma/schema.prisma`

```prisma
model Document {
  id               String   @id @default(cuid())
  projectId        String
  uploadedById     String
  filename         String
  originalFilename String
  contentType      String   // 'pdf', 'docx', 'md', 'txt', 'png', 'jpg'
  storagePath      String   // MinIO object key
  fileSize         BigInt
  processingStatus String   @default("pending") // pending, processing, completed, failed
  extractedText    String?
  metadata         Json     @default("{}")
  project          Project  @relation(fields: [projectId], references: [id])
  uploadedBy       User     @relation(fields: [uploadedById], references: [id])
  chunks           DocumentChunk[]
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
}

model DocumentChunk {
  id         String   @id @default(cuid())
  documentId String
  projectId  String
  chunkIndex Int
  content    String
  tokenCount Int?
  metadata   Json     @default("{}")
  document   Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  createdAt  DateTime @default(now())
  // embedding vector(1536) added via raw SQL: migrations/pgvector_chunks.sql
}
```

Raw SQL for pgvector column (run after `prisma migrate`):
```sql
ALTER TABLE "DocumentChunk" ADD COLUMN IF NOT EXISTS embedding vector(1536);
CREATE INDEX IF NOT EXISTS idx_chunks_embedding
  ON "DocumentChunk" USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

### 3.1.2 — Next.js File Upload API Routes

**Files to create:**

**`apps/web/app/api/projects/[id]/files/presign/route.ts`**
- `POST` — accepts `{ filename, contentType }`
- Generates MinIO presigned PUT URL (15-min expiry)
- Returns `{ uploadUrl, objectKey }`

**`apps/web/app/api/projects/[id]/files/route.ts`**
- `GET` — list project documents with status
- `POST` — confirm upload: create `Document` record in Prisma, enqueue BullMQ job

**`apps/web/app/api/projects/[id]/files/[fileId]/route.ts`**
- `GET` — get document metadata
- `DELETE` — soft-delete document, remove from MinIO

**Upload flow:**
```
Client → POST /api/projects/:id/files/presign  (Next.js API)
  ↓
Next.js returns presigned URL
  ↓
Client → PUT {presignedUrl}  (direct to MinIO)
  ↓
Client → POST /api/projects/:id/files  { objectKey, filename, contentType, size }
  ↓
Next.js: create Document in Prisma (status=pending)
Next.js: enqueue BullMQ job { documentId, projectId }
  ↓
Return document metadata
```

**`apps/web/lib/storage.ts`** (update):
```typescript
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

export async function getPresignedUploadUrl(key: string, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: process.env.MINIO_BUCKET!,
    Key: key,
    ContentType: contentType,
  })
  return getSignedUrl(storage, command, { expiresIn: 900 })
}
```

### 3.1.3 — Next.js File Upload UI

**Files to create:**
- `apps/web/components/upload/file-upload-zone.tsx` — drag-and-drop upload
- `apps/web/components/upload/file-list.tsx` — files with processing status
- `apps/web/components/upload/file-progress.tsx` — upload progress bar
- `apps/web/lib/upload.ts` — presigned URL upload client

**Upload UI flow:**
1. Drag files to upload zone
2. Frontend calls `POST .../presign` per file
3. Frontend uploads directly to MinIO using presigned URL
4. Frontend calls `POST .../files` to confirm
5. File list polls status: `pending → processing → completed/failed`

---

## Module 3.2: Document Processing Pipeline

### 3.2.1 — BullMQ Worker (Next.js side)

**File:** `apps/web/lib/workers/document-worker.ts`

```typescript
import { Worker } from 'bullmq'
import { redis } from '../redis'
import { callAI } from '../ai-client'
import { db } from '../db'

export const documentWorker = new Worker(
  'document-processing',
  async (job) => {
    const { documentId, projectId } = job.data

    // Update status to processing
    await db.document.update({ where: { id: documentId }, data: { processingStatus: 'processing' } })

    try {
      // Call FastAPI to process document
      await callAI('/ai/documents/process', { documentId, projectId })
      await db.document.update({ where: { id: documentId }, data: { processingStatus: 'completed' } })
    } catch (err) {
      await db.document.update({ where: { id: documentId }, data: { processingStatus: 'failed' } })
      throw err
    }
  },
  { connection: redis }
)
```

Workers start in a separate Next.js process or a background script:
```bash
# scripts/start-workers.ts
import '@/lib/workers/document-worker'
```

### 3.2.2 — FastAPI Document Processing

**Files to create:**
- `apps/ai/app/documents/parser.py` — dispatcher (routes to correct parser by content type)
- `apps/ai/app/documents/pdf_parser.py` — PyPDF2 + pdfminer
- `apps/ai/app/documents/docx_parser.py` — python-docx
- `apps/ai/app/documents/markdown_parser.py`
- `apps/ai/app/documents/image_parser.py` — Pillow + pytesseract + GPT Vision
- `apps/ai/app/documents/chunker.py` — text chunking with overlap

**Parser interface:**
```python
class DocumentParser(ABC):
    @abstractmethod
    async def parse(self, content: bytes, filename: str) -> ParsedDocument:
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
    section_type: str  # "heading", "paragraph", "table", "code", "image"
```

**Chunking strategy:**
- Chunk size: 512 tokens (~2000 chars)
- Overlap: 50 tokens
- Preserve section boundaries

### 3.2.3 — FastAPI Embedding & Vector Storage

**Files to create:**
- `apps/ai/app/rag/embedder.py` — OpenAI `text-embedding-3-small`
- `apps/ai/app/rag/vector_store.py` — pgvector insert + search
- `apps/ai/app/rag/retriever.py` — RAG retrieval with relevance scoring
- `apps/ai/app/api/documents.py` — document processing endpoints

**Vector store:**
```python
class VectorStore:
    async def store_chunks(self, project_id: str, doc_id: str, chunks: list[EmbeddedChunk]) -> None:
        # Batch insert into document_chunks via psycopg2 with pgvector
        pass

    async def search(self, project_id: str, query_embedding: list[float], limit: int = 10) -> list[SearchResult]:
        # SELECT ... ORDER BY embedding <=> %s::vector LIMIT %s
        pass
```

**FastAPI document endpoints (called by Next.js only):**
```
POST /ai/documents/process   — download from MinIO, parse, chunk, embed, store
GET  /ai/documents/:id/status
POST /ai/documents/:id/reprocess
DELETE /ai/documents/:id
```

### 3.2.4 — Knowledge Base Search API

**Files to create:**
- `apps/web/app/api/projects/[id]/knowledge/search/route.ts` — Next.js search endpoint
- `apps/web/app/api/projects/[id]/knowledge/route.ts` — list knowledge entries

**Search flow:**
```
Client → POST /api/projects/:id/knowledge/search { query, limit }
  ↓
Next.js → POST /ai/search { projectId, query, limit }  (FastAPI)
  ↓
FastAPI: embed query → pgvector cosine search → return ranked chunks
  ↓
Next.js returns results to client
```

**Search response:**
```json
{
  "results": [
    {
      "chunkId": "...",
      "documentId": "...",
      "documentFilename": "PRD.pdf",
      "content": "Users must authenticate via email/password...",
      "score": 0.92,
      "metadata": { "section": "Authentication" }
    }
  ]
}
```

---

## TypeScript Types

**Files to create/update:**
- `packages/types/src/document.ts` — Document, DocumentChunk, UploadRequest, UploadResponse
- `packages/types/src/knowledge-base.ts` — SearchRequest, SearchResult

---

## Docker Compose Updates

Add FastAPI worker service:
```yaml
ai-worker:
  build: ./apps/ai
  command: python -m app.worker
  depends_on: [redis, postgres, minio]
  environment:
    - DATABASE_URL=${DATABASE_URL}
    - REDIS_URL=${REDIS_URL}
    - MINIO_ENDPOINT=${MINIO_ENDPOINT}
    - AI_SERVICE_TOKEN=${AI_SERVICE_TOKEN}
    - OPENAI_API_KEY=${OPENAI_API_KEY}
```

---

## Verification Steps

1. Upload a PDF via presigned URL → file appears in MinIO console
2. `Document` record created in Prisma with `status=pending`
3. BullMQ job enqueued → FastAPI worker picks up → status transitions `pending → processing → completed`
4. PostgreSQL: `document_chunks` table populated with vector embeddings
5. Search endpoint returns relevant chunks with similarity scores ≥ 0.7
6. Upload failure (unsupported type) → 400; processing failure → status `failed`, can reprocess
7. UI: Upload file → see status badge change → knowledge search returns results

---

## Implementation Order

1. Prisma schema update (Document, DocumentChunk) + migrate + pgvector raw SQL
2. Next.js presigned URL API route
3. Next.js file confirm + list API routes
4. Next.js file upload UI (drag-drop, progress, status)
5. BullMQ document worker (Next.js side)
6. FastAPI document parsers (PDF, DOCX, MD, image)
7. FastAPI chunker + embedder
8. FastAPI vector store (pgvector insert + search)
9. FastAPI document processing endpoint
10. Next.js knowledge search API route
11. TypeScript types
12. Docker Compose worker service
13. End-to-end verification