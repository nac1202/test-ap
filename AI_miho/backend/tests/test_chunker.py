import pytest
from app.core.knowledge.chunker import TextChunker, SubtitleChunker
from app.core.knowledge.token_counter import HeuristicTokenCounter
from app.core.knowledge.parsers.base import ParsedElement
from app.models.knowledge import TranscriptCue

def test_text_chunker_relationships():
    counter = HeuristicTokenCounter()
    chunker = TextChunker(token_counter=counter, max_tokens=10)
    
    # Very long text that will be split by chunker
    elements = [
        ParsedElement(element_type="paragraph", text="これは一つ目の文です。これは二つ目の文で、十トークンを確実に超える非常に長い文章になっています。これも分割されるはずです。", metadata={}, page_number=1)
    ]
    
    chunks = chunker.chunk_elements(elements, "src1")
    
    # Should be split into at least 2 chunks
    assert len(chunks) >= 2
    
    # First chunk has no prev, but has next
    assert chunks[0].previous_chunk_id is None
    assert chunks[0].next_chunk_id == chunks[1].id
    
    # Last chunk has no next, but has prev
    assert chunks[-1].next_chunk_id is None
    assert chunks[-1].previous_chunk_id == chunks[-2].id
    
    # Validate page range
    assert chunks[0].page_start == 1
    assert chunks[0].page_end == 1
    
def test_subtitle_chunker_boundaries():
    counter = HeuristicTokenCounter()
    chunker = SubtitleChunker(token_counter=counter, silence_gap_seconds=2.0)
    
    cues = [
        TranscriptCue(source_id="src1", original_index=1, start_time=0.0, end_time=1.0, speaker="A", text="Hello", content_hash="hash"),
        # Gap > 2.0s triggers split
        TranscriptCue(source_id="src1", original_index=2, start_time=4.0, end_time=5.0, speaker="A", text="World", content_hash="hash"),
        # Speaker change triggers split
        TranscriptCue(source_id="src1", original_index=3, start_time=5.5, end_time=6.0, speaker="B", text="Hi", content_hash="hash"),
    ]
    
    chunks = chunker.chunk_cues(cues, "src1")
    
    assert len(chunks) == 3
    assert chunks[0].text == "Hello"
    assert chunks[1].text == "World"
    assert chunks[2].text == "Hi"
    
    assert chunks[0].timestamp_start == 0.0
    assert chunks[0].timestamp_end == 1.0
