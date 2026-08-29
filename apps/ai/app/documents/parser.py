import os
from dataclasses import dataclass
from abc import ABC, abstractmethod
from typing import List, Optional

@dataclass
class DocumentSection:
    title: Optional[str]
    content: str
    section_type: str

@dataclass
class ParsedDocument:
    text: str
    sections: List[DocumentSection]
    metadata: dict
    page_count: Optional[int] = None

class DocumentParser(ABC):
    @abstractmethod
    async def parse(self, content: bytes, filename: str) -> ParsedDocument:
        pass

class MarkdownParser(DocumentParser):
    async def parse(self, content: bytes, filename: str) -> ParsedDocument:
        # Simplistic markdown parser for now
        text = content.decode('utf-8', errors='replace')
        
        # Split by heading
        lines = text.split('\n')
        sections = []
        current_title = "Document Start"
        current_content = []
        
        for line in lines:
            if line.startswith('#'):
                if current_content:
                    sections.append(DocumentSection(current_title, "\n".join(current_content), "text"))
                    current_content = []
                current_title = line.strip('#').strip()
            else:
                current_content.append(line)
                
        if current_content:
            sections.append(DocumentSection(current_title, "\n".join(current_content), "text"))
            
        return ParsedDocument(
            text=text,
            sections=sections,
            metadata={"source_type": "markdown"}
        )

# Factory for parsing
class ParserFactory:
    @staticmethod
    def get_parser(filename: str, content_type: str) -> DocumentParser:
        from app.documents.pdf_parser import PDFParser
        from app.documents.docx_parser import DocxParser
        from app.documents.image_parser import ImageParser
        
        if content_type == "application/pdf" or filename.endswith(".pdf"):
            return PDFParser()
        elif "word" in content_type or filename.endswith(".docx"):
            return DocxParser()
        elif content_type.startswith("image/"):
            return ImageParser()
        else:
            return MarkdownParser()
