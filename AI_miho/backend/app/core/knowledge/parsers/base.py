from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any
from pathlib import Path
from dataclasses import dataclass
from app.models.knowledge import TranscriptCue

@dataclass
class ParsedElement:
    element_type: str  # "heading", "paragraph", "list", "table", "code_block", "blockquote", "page_marker"
    text: str
    metadata: Dict[str, Any]
    # For Markdown/Text:
    heading_level: Optional[int] = None
    page_number: Optional[int] = None

@dataclass
class ParsedDocument:
    normalized_text: str
    elements: List[ParsedElement]
    cues: List[TranscriptCue]
    warnings: List[str]
    metadata: Dict[str, Any]  # book_title, video_title, author etc.

class KnowledgeParser(ABC):
    @abstractmethod
    def supports(self, file_path: Path, mime_type: str = "") -> bool:
        """Return True if this parser can handle the given file."""
        pass

    @abstractmethod
    def parse(self, file_path: Path, source_id: str) -> ParsedDocument:
        """Parse the file and return a ParsedDocument."""
        pass
