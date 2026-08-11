import pytest
from pathlib import Path
import tempfile
import os

from app.models.knowledge import KnowledgeSource, RightsStatus, SourceStatus, DuplicateStatus
from app.core.knowledge.in_memory_repository import InMemoryKnowledgeRepository
from app.core.knowledge.deduplication import DeduplicationService
from app.core.knowledge.token_counter import HeuristicTokenCounter
from app.core.knowledge.chunker import TextChunker, SubtitleChunker
from app.core.knowledge.parsers.text_parser import TextParser
from app.core.knowledge.parsers.markdown_parser import MarkdownParser
from app.core.knowledge.parsers.vtt_srt_parser import SubtitleParser
from app.core.knowledge.parsers.docx_parser import DocxParser
from app.core.knowledge.utils.security import SecurityError

def test_rights_eligibility():
    s = KnowledgeSource(
        organization_id="org1",
        title="Test",
        source_type="text",
        original_filename="a.txt",
        stored_filename="b.txt",
        content_hash="abc",
        mime_type="text/plain",
        file_size=10,
        rights_status=RightsStatus.PERMISSION_CONFIRMED,
        is_enabled=True,
        source_status=SourceStatus.ACTIVE
    )
    assert s.is_eligible_for_production_rag is True

    s.rights_status = RightsStatus.UNCONFIRMED
    assert s.is_eligible_for_production_rag is False

    s.rights_status = RightsStatus.PERMISSION_CONFIRMED
    s.is_enabled = False
    assert s.is_eligible_for_production_rag is False

def test_text_parser():
    parser = TextParser()
    with tempfile.NamedTemporaryFile(suffix=".txt", delete=False, mode="w", encoding="utf-8") as f:
        f.write("Hello World.\n\n[Page: 12]\nThis is a test.\n\n[Page: 10]\nPage gap here.")
        temp_path = f.name
        
    try:
        doc = parser.parse(Path(temp_path), "src1")
        assert "Hello World." in doc.normalized_text
        assert len(doc.elements) > 0
        
        # Check warnings for page reverse
        assert any("decreased" in w for w in doc.warnings)
    finally:
        os.remove(temp_path)

def test_markdown_parser():
    parser = MarkdownParser()
    content = """# Header 1
## Subheader 2
Some text here.

[Page: 5]
More text.

```python
# code block
print("Hello")
```
"""
    with tempfile.NamedTemporaryFile(suffix=".md", delete=False, mode="w", encoding="utf-8") as f:
        f.write(content)
        temp_path = f.name
        
    try:
        doc = parser.parse(Path(temp_path), "src1")
        headings = [el for el in doc.elements if el.element_type == "heading"]
        assert len(headings) == 2
        assert headings[0].heading_level == 1
        assert headings[1].heading_level == 2
        
        code_blocks = [el for el in doc.elements if el.element_type == "code_block"]
        assert len(code_blocks) == 1
        assert 'print("Hello")' in code_blocks[0].text
        
        pages = [el for el in doc.elements if el.element_type == "page_marker"]
        assert len(pages) == 1
        assert pages[0].page_number == 5
    finally:
        os.remove(temp_path)

def test_subtitle_parser_vtt():
    parser = SubtitleParser()
    content = """WEBVTT

00:00:01.000 --> 00:00:04.000
<v SpeakerA>Hello.

00:00:05.000 --> 00:00:02.000
<v SpeakerB>World.
"""
    with tempfile.NamedTemporaryFile(suffix=".vtt", delete=False, mode="w", encoding="utf-8") as f:
        f.write(content)
        temp_path = f.name
        
    try:
        doc = parser.parse(Path(temp_path), "src1")
        assert len(doc.cues) == 2
        assert doc.cues[0].text == "Hello."
        assert any("reversal" in w for w in doc.warnings)
    finally:
        os.remove(temp_path)

def test_text_chunker():
    counter = HeuristicTokenCounter()
    chunker = TextChunker(token_counter=counter, max_tokens=10) # very small
    
    parser = MarkdownParser()
    content = "# Title\n\nSome paragraph that is slightly longer than ten tokens surely.\n\nAnother one."
    with tempfile.NamedTemporaryFile(suffix=".md", delete=False, mode="w", encoding="utf-8") as f:
        f.write(content)
        temp_path = f.name
        
    try:
        doc = parser.parse(Path(temp_path), "src1")
        chunks = chunker.chunk_elements(doc.elements, "src1")
        assert len(chunks) > 2
        
        # Check heading path
        for c in chunks:
            if "paragraph" in c.text:
                assert "Title" in c.heading_path
    finally:
        os.remove(temp_path)

def test_deduplication():
    repo = InMemoryKnowledgeRepository()
    dedup = DeduplicationService(repo)
    
    s = KnowledgeSource(
        organization_id="org1",
        title="Test",
        source_type="text",
        original_filename="a.txt",
        stored_filename="b.txt",
        content_hash="hash1",
        mime_type="text/plain",
        file_size=10
    )
    repo.create_source(s)
    
    # Exact binary duplicate
    status = dedup.check_duplicate("org1", "hash1", "norm_hash1")
    assert status == DuplicateStatus.DUPLICATE
    
    # Unique
    status = dedup.check_duplicate("org1", "hash2", "norm_hash2")
    assert status == DuplicateStatus.UNIQUE

def test_zip_bomb_docx():
    # Attempting to parse a dummy zip that lacks document.xml
    parser = DocxParser()
    with tempfile.NamedTemporaryFile(suffix=".docx", delete=False, mode="w") as f:
        f.write("Not a zip")
        temp_path = f.name
        
    try:
        with pytest.raises(SecurityError):
            parser.parse(Path(temp_path), "src1")
    finally:
        os.remove(temp_path)
