import re
from pathlib import Path
from typing import List, Optional
from app.core.knowledge.parsers.base import KnowledgeParser, ParsedDocument, ParsedElement
from app.core.knowledge.utils.text import normalize_for_display, PAGE_TAG_PATTERN

class TextParser(KnowledgeParser):
    def supports(self, file_path: Path, mime_type: str = "") -> bool:
        return file_path.suffix.lower() == ".txt" or mime_type == "text/plain"

    def parse(self, file_path: Path, source_id: str) -> ParsedDocument:
        warnings = []
        try:
            # We try UTF-8 with BOM first (handled by utf-8-sig)
            with open(file_path, "r", encoding="utf-8-sig") as f:
                raw_text = f.read()
        except UnicodeDecodeError:
            warnings.append(f"Failed to read as UTF-8. Trying local encoding for {file_path.name}")
            with open(file_path, "r") as f:
                raw_text = f.read()

        text = normalize_for_display(raw_text)
        
        elements = []
        last_page = None
        
        # Split by empty lines to form paragraphs
        paragraphs = re.split(r'\n\s*\n', text)
        
        for p in paragraphs:
            p = p.strip()
            if not p:
                continue
                
            # Check for page tags
            page_matches = PAGE_TAG_PATTERN.finditer(p)
            for m in page_matches:
                page_num = int(m.group(1))
                # Validate page tag
                if page_num <= 0:
                    warnings.append(f"Error: Page number must be > 0. Found {page_num}")
                else:
                    if last_page is not None:
                        if page_num < last_page:
                            warnings.append(f"Error: Page number decreased from {last_page} to {page_num}")
                        elif page_num == last_page:
                            warnings.append(f"Warning: Page {page_num} appeared consecutively")
                        elif page_num > last_page + 20:
                            warnings.append(f"Warning: Large page gap detected: {last_page} to {page_num}")
                    last_page = page_num
                    
                elements.append(ParsedElement(
                    element_type="page_marker",
                    text=m.group(0),
                    metadata={},
                    page_number=page_num
                ))
            
            # Remove the page tags from the text if they are standalone, or just keep them 
            # as part of paragraph. The user said: "コードブロック内に [Page: 72] と書かれていても、ページタグとして誤認しないでください。"
            # In TextParser there are no code blocks, but we shouldn't destroy the text.
            elements.append(ParsedElement(
                element_type="paragraph",
                text=p,
                metadata={},
                page_number=last_page
            ))

        return ParsedDocument(
            normalized_text=text,
            elements=elements,
            cues=[],
            warnings=warnings,
            metadata={}
        )
