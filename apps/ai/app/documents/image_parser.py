import io
from PIL import Image
import pytesseract
from app.documents.parser import DocumentParser, ParsedDocument, DocumentSection

class ImageParser(DocumentParser):
    async def parse(self, content: bytes, filename: str) -> ParsedDocument:
        img = Image.open(io.BytesIO(content))
        text = pytesseract.image_to_string(img)
        
        sections = [
            DocumentSection(
                title="Extracted Text",
                content=text,
                section_type="image_ocr"
            )
        ]
        
        return ParsedDocument(
            text=text,
            sections=sections,
            metadata={"source_type": "image"}
        )
