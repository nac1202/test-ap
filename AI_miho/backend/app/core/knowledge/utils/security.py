import os
import zipfile
from pathlib import Path
import uuid

# Security limits for DOCX/ZIP extraction
MAX_ZIP_ENTRIES = 1000
MAX_UNCOMPRESSED_TOTAL_SIZE = 50 * 1024 * 1024  # 50MB total uncompressed
MAX_UNCOMPRESSED_FILE_SIZE = 10 * 1024 * 1024   # 10MB per file
MAX_COMPRESSION_RATIO = 100

class SecurityError(Exception):
    pass

def validate_zip_bomb(file_path: Path) -> None:
    """
    Validates a ZIP file (like DOCX) to prevent zip bombs, path traversals,
    and excessive resource consumption.
    Raises SecurityError if validation fails.
    """
    if not zipfile.is_zipfile(file_path):
        raise SecurityError("Not a valid ZIP format.")
        
    try:
        with zipfile.ZipFile(file_path, 'r') as zf:
            infolist = zf.infolist()
            
            if len(infolist) > MAX_ZIP_ENTRIES:
                raise SecurityError(f"Too many entries in ZIP: {len(infolist)} > {MAX_ZIP_ENTRIES}")
                
            total_uncompressed = 0
            
            # Check for required XMLs for docx
            has_document_xml = False
            
            for info in infolist:
                # Path traversal check
                if '..' in info.filename or info.filename.startswith('/') or info.filename.startswith('\\'):
                    raise SecurityError(f"Path traversal attempt detected in ZIP: {info.filename}")
                    
                # Individual file size
                if info.file_size > MAX_UNCOMPRESSED_FILE_SIZE:
                    raise SecurityError(f"File {info.filename} exceeds maximum uncompressed size.")
                    
                # Compression ratio check (only if compressed size is reasonably > 0 to avoid DivByZero)
                if info.compress_size > 0:
                    ratio = info.file_size / info.compress_size
                    if ratio > MAX_COMPRESSION_RATIO:
                        raise SecurityError(f"Suspicious compression ratio {ratio} for file {info.filename}")
                        
                total_uncompressed += info.file_size
                if total_uncompressed > MAX_UNCOMPRESSED_TOTAL_SIZE:
                    raise SecurityError("Total uncompressed size exceeds limit (Zip bomb protection).")
                    
                if info.filename == 'word/document.xml':
                    has_document_xml = True
                    
            if not has_document_xml:
                # It's a ZIP but maybe not a valid DOCX. We just warn or it might be OK if it's another format.
                # Since we only use this for DOCX currently:
                raise SecurityError("Missing word/document.xml. Not a valid DOCX file.")
                
    except zipfile.BadZipFile:
        raise SecurityError("Bad ZIP file.")
    except Exception as e:
        if isinstance(e, SecurityError):
            raise
        raise SecurityError(f"Failed to validate ZIP: {str(e)}")

def generate_secure_filename(original_extension: str) -> str:
    """Generates a secure random filename preserving the extension."""
    ext = original_extension.lower()
    if not ext.startswith('.'):
        ext = '.' + ext
    return f"{uuid.uuid4().hex}{ext}"

def secure_basename(path_str: str) -> str:
    """Returns the basename to prevent path traversal when reading filenames."""
    return os.path.basename(path_str)
