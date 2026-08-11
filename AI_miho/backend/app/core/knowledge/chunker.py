from typing import List, Optional
from app.models.knowledge import KnowledgeChunk, TranscriptCue
from app.core.knowledge.token_counter import TokenCounter
from app.core.knowledge.utils.text import get_hash
import re

class TextChunker:
    def __init__(self, token_counter: TokenCounter, max_tokens: int = 500, min_tokens: int = 50, overlap_tokens: int = 50):
        self.token_counter = token_counter
        self.max_tokens = max_tokens
        self.min_tokens = min_tokens
        self.overlap_tokens = overlap_tokens

    def _split_long_text(self, text: str) -> List[str]:
        """Split a long text block by punctuation to respect max_tokens."""
        parts = re.split(r'([。．！？\.\!\?]+\s*)', text)
        sentences = []
        for i in range(0, len(parts)-1, 2):
            sentences.append(parts[i] + parts[i+1])
        if len(parts) % 2 == 1 and parts[-1]:
            sentences.append(parts[-1])
            
        chunks = []
        current_chunk = ""
        
        for sentence in sentences:
            if not sentence:
                continue
            if self.token_counter.count(current_chunk + sentence) > self.max_tokens:
                if current_chunk:
                    chunks.append(current_chunk.strip())
                    current_chunk = sentence
                else:
                    # A single sentence is longer than max_tokens. Force split roughly.
                    chunks.append(sentence[:self.max_tokens].strip())
                    current_chunk = sentence[self.max_tokens:]
            else:
                current_chunk += sentence
                
        if current_chunk.strip():
            chunks.append(current_chunk.strip())
        return chunks

    def chunk_elements(self, elements: List['ParsedElement'], source_id: str) -> List[KnowledgeChunk]:
        """
        Groups ParsedElements into chunks.
        Respects heading boundaries. Try to merge short paragraphs.
        """
        chunks = []
        current_text = []
        current_tokens = 0
        current_heading_path = []
        current_page_start = None
        current_page_end = None
        chunk_index = 0
        
        def flush_chunk():
            nonlocal current_text, current_tokens, chunk_index, current_page_start, current_page_end
            if not current_text:
                return
            
            text = "\n\n".join(current_text)
            
            # If still too long, split further
            if current_tokens > self.max_tokens:
                sub_texts = self._split_long_text(text)
                for st in sub_texts:
                    c = KnowledgeChunk(
                        source_id=source_id,
                        chunk_index=chunk_index,
                        chunk_type="paragraph",
                        text=st,
                        token_count=self.token_counter.count(st),
                        character_count=len(st),
                        heading_path=list(current_heading_path),
                        page_start=current_page_start,
                        page_end=current_page_end,
                        content_hash=get_hash(st)
                    )
                    chunks.append(c)
                    chunk_index += 1
            else:
                c = KnowledgeChunk(
                    source_id=source_id,
                    chunk_index=chunk_index,
                    chunk_type="paragraph",
                    text=text,
                    token_count=current_tokens,
                    character_count=len(text),
                    heading_path=list(current_heading_path),
                    page_start=current_page_start,
                    page_end=current_page_end,
                    content_hash=get_hash(text)
                )
                chunks.append(c)
                chunk_index += 1
                
            current_text = []
            current_tokens = 0
            current_page_start = None
            current_page_end = None

        # Track heading stack: list of (level, text)
        heading_stack = []

        for el in elements:
            if el.element_type == "heading":
                flush_chunk()
                level = el.heading_level or 1
                
                # Pop stack
                while heading_stack and heading_stack[-1][0] >= level:
                    heading_stack.pop()
                heading_stack.append((level, el.text))
                current_heading_path = [h[1] for h in heading_stack]
                
                # Heading itself can be a chunk or just prepended. We'll start a new chunk with it.
                current_text.append(el.text)
                current_tokens += self.token_counter.count(el.text)
                current_page_start = current_page_end = el.page_number
                
            elif el.element_type == "page_marker":
                # Just update page info
                if current_page_start is None:
                    current_page_start = el.page_number
                current_page_end = el.page_number
                
            else:
                # Add to current chunk
                el_tokens = self.token_counter.count(el.text)
                if current_tokens + el_tokens > self.max_tokens:
                    flush_chunk()
                    
                current_text.append(el.text)
                current_tokens += el_tokens
                if current_page_start is None:
                    current_page_start = el.page_number
                current_page_end = el.page_number
                
        flush_chunk()
        
        # Merge very small chunks with the previous one if possible, and set prev/next
        for i in range(len(chunks)):
            if i > 0:
                chunks[i].previous_chunk_id = chunks[i-1].id
                chunks[i-1].next_chunk_id = chunks[i].id
                
        return chunks

class SubtitleChunker:
    def __init__(self, token_counter: TokenCounter, max_tokens: int = 500, min_tokens: int = 50, max_duration_seconds: float = 180.0, silence_gap_seconds: float = 2.0):
        self.token_counter = token_counter
        self.max_tokens = max_tokens
        self.min_tokens = min_tokens
        self.max_duration_seconds = max_duration_seconds
        self.silence_gap_seconds = silence_gap_seconds

    def chunk_cues(self, cues: List[TranscriptCue], source_id: str) -> List[KnowledgeChunk]:
        chunks = []
        if not cues:
            return chunks
            
        current_cues = []
        current_tokens = 0
        chunk_index = 0
        
        def flush_chunk():
            nonlocal current_cues, current_tokens, chunk_index
            if not current_cues:
                return
                
            text = "\n".join([c.text for c in current_cues])
            timestamp_start = current_cues[0].start_time
            timestamp_end = current_cues[-1].end_time
            included_ids = [c.id for c in current_cues]
            
            c = KnowledgeChunk(
                source_id=source_id,
                chunk_index=chunk_index,
                chunk_type="transcript",
                text=text,
                token_count=current_tokens,
                character_count=len(text),
                timestamp_start=timestamp_start,
                timestamp_end=timestamp_end,
                included_cue_ids=included_ids,
                content_hash=get_hash(text)
            )
            chunks.append(c)
            chunk_index += 1
            
            current_cues = []
            current_tokens = 0

        for cue in cues:
            cue_tokens = self.token_counter.count(cue.text)
            
            # Check boundaries
            if current_cues:
                duration = cue.end_time - current_cues[0].start_time
                gap = cue.start_time - current_cues[-1].end_time
                speaker_changed = current_cues[-1].speaker != cue.speaker and cue.speaker is not None
                
                if (current_tokens + cue_tokens > self.max_tokens or
                    duration > self.max_duration_seconds or
                    gap >= self.silence_gap_seconds or
                    speaker_changed):
                    flush_chunk()
                    
            current_cues.append(cue)
            current_tokens += cue_tokens
            
        flush_chunk()
        
        for i in range(len(chunks)):
            if i > 0:
                chunks[i].previous_chunk_id = chunks[i-1].id
                chunks[i-1].next_chunk_id = chunks[i].id
                
        return chunks
