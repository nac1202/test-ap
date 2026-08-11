import re
from pathlib import Path
from typing import List, Optional
from app.core.knowledge.parsers.base import KnowledgeParser, ParsedDocument, ParsedElement
from app.core.knowledge.utils.text import normalize_for_display, PAGE_TAG_PATTERN

class MarkdownParser(KnowledgeParser):
    def supports(self, file_path: Path, mime_type: str = "") -> bool:
        return file_path.suffix.lower() == ".md" or mime_type == "text/markdown"

    def parse(self, file_path: Path, source_id: str) -> ParsedDocument:
        warnings = []
        try:
            with open(file_path, "r", encoding="utf-8-sig") as f:
                raw_text = f.read()
        except UnicodeDecodeError:
            warnings.append(f"Failed to read as UTF-8. Trying local encoding for {file_path.name}")
            with open(file_path, "r") as f:
                raw_text = f.read()

        text = normalize_for_display(raw_text)
        
        elements = []
        last_page = None
        
        lines = text.split('\n')
        
        in_code_block = False
        code_block_lines = []
        
        # A simple state machine for blocks
        current_block_type = None
        current_block_lines = []
        
        def flush_block():
            nonlocal current_block_type, current_block_lines, last_page
            if not current_block_lines:
                return
            
            block_text = "\n".join(current_block_lines).strip()
            if not block_text:
                current_block_lines = []
                return
                
            if current_block_type != "code_block":
                # Check page tags outside of code blocks
                page_matches = PAGE_TAG_PATTERN.finditer(block_text)
                for m in page_matches:
                    page_num = int(m.group(1))
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
            
            # Heading parsing
            heading_level = None
            if current_block_type == "heading":
                m = re.match(r'^(#{1,6})\s+(.*)', block_text)
                if m:
                    heading_level = len(m.group(1))
                    block_text = m.group(2).strip()
            
            elements.append(ParsedElement(
                element_type=current_block_type or "paragraph",
                text=block_text,
                metadata={},
                heading_level=heading_level,
                page_number=last_page
            ))
            current_block_lines = []
            current_block_type = None

        for line in lines:
            stripped = line.strip()
            
            # Code block toggle
            if stripped.startswith('```'):
                if in_code_block:
                    code_block_lines.append(line)
                    current_block_type = "code_block"
                    current_block_lines = code_block_lines
                    flush_block()
                    in_code_block = False
                    code_block_lines = []
                else:
                    flush_block()
                    in_code_block = True
                    code_block_lines = [line]
                continue
                
            if in_code_block:
                code_block_lines.append(line)
                continue
                
            # Blockquote
            if stripped.startswith('>'):
                if current_block_type != "blockquote":
                    flush_block()
                    current_block_type = "blockquote"
                current_block_lines.append(line)
                continue
                
            # Heading
            if re.match(r'^#{1,6}\s+', stripped):
                flush_block()
                current_block_type = "heading"
                current_block_lines.append(stripped)
                flush_block()
                continue
                
            # List items (ul/ol)
            if re.match(r'^(\*|-|\+|\d+\.)\s+', stripped):
                if current_block_type != "list":
                    flush_block()
                    current_block_type = "list"
                current_block_lines.append(line)
                continue
                
            # Table row (simplified detection)
            if stripped.startswith('|') and stripped.endswith('|'):
                if current_block_type != "table":
                    flush_block()
                    current_block_type = "table"
                current_block_lines.append(line)
                continue
                
            # Empty line
            if not stripped:
                flush_block()
                continue
                
            # Paragraph
            if current_block_type not in ("paragraph", "list", "table", "blockquote", None):
                flush_block()
            
            if current_block_type is None:
                current_block_type = "paragraph"
            current_block_lines.append(line)
            
        flush_block()

        return ParsedDocument(
            normalized_text=text,
            elements=elements,
            cues=[],
            warnings=warnings,
            metadata={}
        )
