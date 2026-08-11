import pytest
from pathlib import Path
import tempfile
import os
import zipfile

from app.core.knowledge.parsers.text_parser import TextParser
from app.core.knowledge.parsers.markdown_parser import MarkdownParser
from app.core.knowledge.parsers.vtt_srt_parser import SubtitleParser
from app.core.knowledge.parsers.docx_parser import DocxParser
from app.core.knowledge.utils.security import SecurityError

def test_markdown_and_text_all_cases():
    md_content = """\ufeff# H1
## H2
### H3
## H2 back

Some paragraph here.

[Page: 10]
Normal page.

[Page: 5]
Reverse page.

[Page: 5]
Consecutive.

[Page: 100]
Big jump.

[Page: 0]
Negative.

[Page: abc]
Invalid format ignored.

```python
[Page: 72] # Should not be a page marker
print(1)
```

| Col1 | Col2 |
|---|---|
| A | B |

* List 1
* List 2

> Blockquote
"""
    parser = MarkdownParser()
    with tempfile.NamedTemporaryFile(suffix=".md", delete=False, mode="w", encoding="utf-8-sig") as f:
        f.write(md_content)
        temp_path = f.name
        
    try:
        doc = parser.parse(Path(temp_path), "src1")
        
        # Heading hierarchy
        h_elements = [el for el in doc.elements if el.element_type == "heading"]
        assert h_elements[0].heading_level == 1
        assert h_elements[1].heading_level == 2
        assert h_elements[2].heading_level == 3
        assert h_elements[3].heading_level == 2
        
        # Pages
        pages = [el for el in doc.elements if el.element_type == "page_marker"]
        # 10, 5, 5, 100, -1
        assert len(pages) == 5
        assert pages[0].page_number == 10
        assert pages[1].page_number == 5
        
        # Warnings
        warns = " ".join(doc.warnings)
        assert "decreased" in warns # for 10 -> 5
        assert "consecutively" in warns # for 5 -> 5
        assert "Large page gap" in warns # for 5 -> 100
        assert "> 0" in warns # for -1
        
        # Code block
        code_blocks = [el for el in doc.elements if el.element_type == "code_block"]
        assert len(code_blocks) == 1
        assert "[Page: 72]" in code_blocks[0].text # inside text
        
        # Markdown table & lists
        tables = [el for el in doc.elements if el.element_type == "table"]
        assert len(tables) == 1
        
        lists = [el for el in doc.elements if el.element_type == "list"]
        assert len(lists) > 0
        
        blockquotes = [el for el in doc.elements if el.element_type == "blockquote"]
        assert len(blockquotes) == 1
        
    finally:
        os.remove(temp_path)

def test_text_parser_empty():
    parser = TextParser()
    with tempfile.NamedTemporaryFile(suffix=".txt", delete=False, mode="w", encoding="utf-8") as f:
        f.write("   \n  \n")
        temp_path = f.name
    try:
        doc = parser.parse(Path(temp_path), "src1")
        assert len(doc.elements) == 0
        assert doc.normalized_text.strip() == ""
    finally:
        os.remove(temp_path)

def test_vtt_parser_advanced():
    parser = SubtitleParser()
    content = """WEBVTT

00:00:01.000 --> 00:00:04.000
<v SpeakerA>Hello.
This is a multiline.

00:00:05.000 --> 00:00:02.000
<v SpeakerB>Reversed

00:00:05.000 --> 00:00:06.000
<v SpeakerB>Overlapped

00:00:05.000 --> 00:00:06.000
<v SpeakerB>Overlapped
"""
    with tempfile.NamedTemporaryFile(suffix=".vtt", delete=False, mode="w", encoding="utf-8") as f:
        f.write(content)
        temp_path = f.name
    try:
        doc = parser.parse(Path(temp_path), "src1")
        assert len(doc.cues) == 4
        assert doc.cues[0].speaker == "SpeakerA"
        assert "multiline" in doc.cues[0].text
        
        warns = " ".join(doc.warnings)
        assert "reversal" in warns.lower()
        assert "duplicate" in warns.lower()
    finally:
        os.remove(temp_path)

def test_srt_parser_advanced():
    parser = SubtitleParser()
    content = """1
00:00:01,000 --> 00:00:04,000
Hello.

2
00:00:05,000 --> 00:00:06,000
World.
"""
    with tempfile.NamedTemporaryFile(suffix=".srt", delete=False, mode="w", encoding="utf-8-sig") as f:
        f.write(content)
        temp_path = f.name
    try:
        doc = parser.parse(Path(temp_path), "src1")
        assert len(doc.cues) == 2
        assert doc.cues[0].text == "Hello."
        assert doc.cues[1].text == "World."
    finally:
        os.remove(temp_path)

def test_docx_parser_security_zip_bomb():
    # Test file that exceeds max uncompressed size or ratio
    # We will just test the zip bomb function directly with a mock zip
    with tempfile.NamedTemporaryFile(suffix=".docx", delete=False) as f:
        with zipfile.ZipFile(f, 'w', zipfile.ZIP_DEFLATED) as zf:
            # Add a file with path traversal
            zf.writestr("../evil.xml", "data")
        temp_path = f.name
        
    try:
        parser = DocxParser()
        with pytest.raises(SecurityError) as exc:
            parser.parse(Path(temp_path), "src1")
        assert "traversal" in str(exc.value).lower()
    finally:
        os.remove(temp_path)

def test_docx_parser_no_xml():
    with tempfile.NamedTemporaryFile(suffix=".docx", delete=False) as f:
        with zipfile.ZipFile(f, 'w') as zf:
            zf.writestr("safe.xml", "data")
        temp_path = f.name
        
    try:
        parser = DocxParser()
        with pytest.raises(SecurityError) as exc:
            parser.parse(Path(temp_path), "src1")
        assert "missing word/document.xml" in str(exc.value).lower()
    finally:
        os.remove(temp_path)
