import io
from PyPDF2 import PdfReader
from app.documents.parser import DocumentParser, ParsedDocument, DocumentSection

class PDFParser(DocumentParser):
    async def parse(self, content: bytes, filename: str) -> ParsedDocument:
        reader = PdfReader(io.BytesIO(content))
        text_blocks = []
        sections = []
        page_count = len(reader.pages)
        
        for i, page in enumerate(reader.pages):
            text = page.extract_text()
            if text:
                text_blocks.append(text)
                sections.append(DocumentSection(
                    title=f"Page {i+1}",
                    content=text,
                    section_type="page"
                ))
                
        full_text = "\n\n".join(text_blocks)
        
        return ParsedDocument(
            text=full_text,
            sections=sections,
            metadata={"source_type": "pdf"},
            page_count=page_count
        )
