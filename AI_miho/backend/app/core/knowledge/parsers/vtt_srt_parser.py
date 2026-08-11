from pathlib import Path
from typing import List, Optional
import pysrt
import webvtt
import uuid

from app.core.knowledge.parsers.base import KnowledgeParser, ParsedDocument, ParsedElement
from app.core.knowledge.utils.text import normalize_for_display, get_hash
from app.models.knowledge import TranscriptCue

class SubtitleParser(KnowledgeParser):
    def supports(self, file_path: Path, mime_type: str = "") -> bool:
        ext = file_path.suffix.lower()
        return ext in (".vtt", ".srt")

    def parse(self, file_path: Path, source_id: str) -> ParsedDocument:
        warnings = []
        cues: List[TranscriptCue] = []
        ext = file_path.suffix.lower()
        
        try:
            if ext == ".vtt":
                captions = webvtt.read(str(file_path))
                for i, caption in enumerate(captions):
                    start_sec = caption.start_in_seconds
                    end_sec = caption.end_in_seconds
                    text = normalize_for_display(caption.text)
                    speaker = None
                    # webvtt-py sometimes exposes voices
                    if hasattr(caption, 'voice') and caption.voice:
                        speaker = caption.voice
                        
                    if not text.strip():
                        warnings.append(f"Warning: Empty caption at index {i}")
                        
                    cues.append(TranscriptCue(
                        source_id=source_id,
                        original_index=i,
                        start_time=start_sec,
                        end_time=end_sec,
                        speaker=speaker,
                        text=text,
                        content_hash=get_hash(text)
                    ))
                    
            elif ext == ".srt":
                subs = pysrt.open(str(file_path), encoding='utf-8-sig')
                for i, sub in enumerate(subs):
                    start_sec = sub.start.ordinal / 1000.0
                    end_sec = sub.end.ordinal / 1000.0
                    text = normalize_for_display(sub.text)
                    
                    if not text.strip():
                        warnings.append(f"Warning: Empty caption at index {i}")
                        
                    cues.append(TranscriptCue(
                        source_id=source_id,
                        original_index=sub.index,
                        start_time=start_sec,
                        end_time=end_sec,
                        speaker=None, # pysrt does not natively extract speaker
                        text=text,
                        content_hash=get_hash(text)
                    ))
        except Exception as e:
            warnings.append(f"Error parsing subtitle file: {str(e)}")
            raise e
            
        # Validation
        for i in range(len(cues)):
            c = cues[i]
            if c.start_time > c.end_time:
                warnings.append(f"Error: Timestamp reversal at index {c.original_index} ({c.start_time} > {c.end_time})")
            if i > 0:
                prev = cues[i-1]
                if c.start_time < prev.end_time:
                    warnings.append(f"Warning: Overlapping timestamps at index {c.original_index} with {prev.original_index}")
                if c.start_time == prev.start_time and c.end_time == prev.end_time and c.text == prev.text:
                    warnings.append(f"Warning: Duplicate caption detected at index {c.original_index}")
                    
        normalized_text = "\n".join([c.text for c in cues])
        
        return ParsedDocument(
            normalized_text=normalized_text,
            elements=[],
            cues=cues,
            warnings=warnings,
            metadata={}
        )
