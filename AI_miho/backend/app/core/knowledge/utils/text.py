import re
import unicodedata
import hashlib
from typing import Tuple, Optional

# Matches [Page: 72], [Page:72], etc.
PAGE_TAG_PATTERN = re.compile(r'\[Page:\s*(\d+)\]', re.IGNORECASE)

def normalize_for_display(text: str) -> str:
    """
    Normalizes text for display and parsing.
    - NFC normalization
    - CRLF to LF
    - Removes zero-width chars and BOM, but preserves tabs and newlines.
    Does not destroy full-width alphanumerics.
    """
    if not text:
        return ""
        
    # Remove BOM if present
    if text.startswith('\ufeff'):
        text = text[1:]
        
    # Unicode normalize
    text = unicodedata.normalize("NFC", text)
    
    # Replace CRLF
    text = text.replace('\r\n', '\n').replace('\r', '\n')
    
    # Remove specific control chars except tab and newline
    # \x00-\x08, \x0B-\x0C, \x0E-\x1F, \x7F
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]+', '', text)
    
    return text

def normalize_for_hash(text: str) -> str:
    """
    Aggressive normalization used ONLY for deduplication hashes.
    Removes all whitespace so formatting changes don't affect the hash.
    """
    text = normalize_for_display(text)
    # Remove all whitespace characters
    text = re.sub(r'\s+', '', text)
    return text

def get_hash(text: str) -> str:
    """Returns SHA-256 hash of the normalized-for-hash text."""
    normalized = normalize_for_hash(text)
    return hashlib.sha256(normalized.encode('utf-8')).hexdigest()

def extract_page_info(text: str) -> Tuple[str, Optional[int]]:
    """
    Extracts the FIRST page tag from the text.
    Returns (cleaned_text, page_number)
    Note: It doesn't strip the tag from text if we want to preserve it,
    but the prompt states we should detect it. We will leave the tag in the text 
    for context, but extract the integer.
    """
    match = PAGE_TAG_PATTERN.search(text)
    if match:
        return text, int(match.group(1))
    return text, None
