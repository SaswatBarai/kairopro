-- =============================================================================
-- pgvector extension + embedding columns
-- Run AFTER prisma migrate: prisma db execute --file prisma/migrations/pgvector.sql
-- =============================================================================

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to DocumentChunk (1536 dims = OpenAI text-embedding-3-small)
ALTER TABLE "DocumentChunk"
  ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Approximate nearest-neighbor index for fast similarity search
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding
  ON "DocumentChunk"
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
