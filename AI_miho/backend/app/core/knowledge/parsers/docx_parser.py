from pathlib import Path
from typing import List, Optional
import docx
from docx.document import Document as _Document
from docx.oxml.text.paragraph import CT_P
from docx.oxml.table import CT_Tbl
from docx.table import _Cell, Table
from docx.text.paragraph import Paragraph

from app.core.knowledge.parsers.base import KnowledgeParser, ParsedDocument, ParsedElement
from app.core.knowledge.utils.text import normalize_for_display, PAGE_TAG_PATTERN
from app.core.knowledge.utils.security import validate_zip_bomb

def iter_block_items(parent):
    """
    Yield each paragraph and table child within *parent*, in document order.
    """
    if isinstance(parent, _Document):
        parent_elm = parent.element.body
    elif isinstance(parent, _Cell):
        parent_elm = parent._tc
    else:
        raise ValueError("Something's not right")

    for child in parent_elm.iterchildren():
        if isinstance(child, CT_P):
            yield Paragraph(child, parent)
        elif isinstance(child, CT_Tbl):
            yield Table(child, parent)

class DocxParser(KnowledgeParser):
    def supports(self, file_path: Path, mime_type: str = "") -> bool:
        return file_path.suffix.lower() == ".docx" or mime_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

    def parse(self, file_path: Path, source_id: str) -> ParsedDocument:
        warnings = []
        
        # Security Check
        try:
            validate_zip_bomb(file_path)
        except Exception as e:
            warnings.append(f"Security validation failed: {str(e)}")
            raise e
            
        doc = docx.Document(file_path)
        
        elements = []
        last_page = None
        full_text_pieces = []
        
        # Check for images and unsupported elements (roughly by searching rels)
        has_images = any("image" in rel.target_ref for rel in doc.part.rels.values())
        if has_images:
            warnings.append("Warning: Image(s) detected in DOCX. Images are ignored in the extraction.")
            
        for block in iter_block_items(doc):
            if isinstance(block, Paragraph):
                text = block.text.strip()
                if not text:
                    continue
                    
                text = normalize_for_display(text)
                full_text_pieces.append(text)
                
                # Check for page tags
                page_matches = PAGE_TAG_PATTERN.finditer(text)
                for m in page_matches:
                    page_num = int(m.group(1))
                    if page_num > 0:
                        last_page = page_num
                    elements.append(ParsedElement(
                        element_type="page_marker",
                        text=m.group(0),
                        metadata={},
                        page_number=page_num
                    ))
                
                # Detect style
                style_name = block.style.name if block.style else "Normal"
                
                if style_name.startswith('Heading'):
                    level_str = style_name.replace('Heading', '').strip()
                    level = int(level_str) if level_str.isdigit() else 1
                    elements.append(ParsedElement(
                        element_type="heading",
                        text=text,
                        metadata={"style": style_name},
                        heading_level=level,
                        page_number=last_page
                    ))
                elif 'List' in style_name:
                    elements.append(ParsedElement(
                        element_type="list",
                        text=text,
                        metadata={"style": style_name},
                        page_number=last_page
                    ))
                else:
                    elements.append(ParsedElement(
                        element_type="paragraph",
                        text=text,
                        metadata={"style": style_name},
                        page_number=last_page
                    ))
                    
            elif isinstance(block, Table):
                # Convert table to Markdown format
                table_md = []
                for i, row in enumerate(block.rows):
                    row_data = []
                    for cell in row.cells:
                        # Clean cell text (replace newlines with spaces for Markdown table)
                        cell_text = cell.text.replace('\n', ' ').strip()
                        cell_text = normalize_for_display(cell_text)
                        row_data.append(cell_text)
                        
                    table_md.append("| " + " | ".join(row_data) + " |")
                    
                    if i == 0:
                        # Add header separator
                        table_md.append("|" + "|".join(["---"] * len(row_data)) + "|")
                        
                table_text = "\n".join(table_md)
                full_text_pieces.append(table_text)
                elements.append(ParsedElement(
                    element_type="table",
                    text=table_text,
                    metadata={"rows": len(block.rows)},
                    page_number=last_page
                ))
                warnings.append("Warning: Table extracted to Markdown format. Merged cells or complex formatting might not be fully preserved.")

        normalized_text = "\n\n".join(full_text_pieces)
        
        core_props = doc.core_properties
        metadata = {
            "title": core_props.title if core_props.title else None,
            "author": core_props.author if core_props.author else None,
        }

        return ParsedDocument(
            normalized_text=normalized_text,
            elements=elements,
            cues=[],
            warnings=warnings,
            metadata=metadata
        )
