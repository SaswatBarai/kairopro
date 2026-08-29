from app.documents.parser import ParsedDocument
from dataclasses import dataclass

@dataclass
class EmbeddedChunk:
    chunk_index: int
    content: str
    token_count: int
    metadata: dict
    embedding: list[float] = None

class DocumentChunker:
    def __init__(self, chunk_size: int = 2000, overlap: int = 200):
        self.chunk_size = chunk_size
        self.overlap = overlap

    def chunk_document(self, parsed_doc: ParsedDocument) -> list[EmbeddedChunk]:
        chunks = []
        current_index = 0
        
        # Basic chunking by sections
        for section in parsed_doc.sections:
            text = section.content
            
            # Simple character-based chunking for phase 3
            # A real implementation would use tiktoken for token-based chunking
            start = 0
            while start < len(text):
                end = min(start + self.chunk_size, len(text))
                
                # If we're not at the end, try to find a natural break (newline or period)
                if end < len(text):
                    last_newline = text.rfind('\n', start, end)
                    last_period = text.rfind('.', start, end)
                    
                    if last_newline != -1 and last_newline > start + self.chunk_size // 2:
                        end = last_newline + 1
                    elif last_period != -1 and last_period > start + self.chunk_size // 2:
                        end = last_period + 1
                
                chunk_text = text[start:end].strip()
                
                if chunk_text:
                    # Estimate token count (chars / 4)
                    est_tokens = len(chunk_text) // 4
                    
                    chunks.append(EmbeddedChunk(
                        chunk_index=current_index,
                        content=chunk_text,
                        token_count=est_tokens,
                        metadata={
                            "section_title": section.title,
                            "section_type": section.section_type
                        }
                    ))
                    current_index += 1
                
                start = end - self.overlap
                
        return chunks
