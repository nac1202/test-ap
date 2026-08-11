from abc import ABC, abstractmethod
import unicodedata

class TokenCounter(ABC):
    @abstractmethod
    def count(self, text: str) -> int:
        """Count estimated tokens in the given text."""
        pass

class HeuristicTokenCounter(TokenCounter):
    """
    A simple, LLM-agnostic heuristic token counter.
    Estimates that 1 full-width character (Japanese, etc.) is roughly 1 token,
    and 1 word of ASCII text (split by space) is roughly 1 token.
    This provides a safe upper-bound estimation without depending on a specific LLM tokenizer.
    """
    def count(self, text: str) -> int:
        if not text:
            return 0
        
        token_count = 0
        current_ascii_word = False
        
        for char in text:
            # Check East Asian Width
            eaw = unicodedata.east_asian_width(char)
            # W (Wide), F (Fullwidth), A (Ambiguous - usually treated as wide in CJK context)
            if eaw in ('W', 'F', 'A'):
                token_count += 1
                current_ascii_word = False
            elif char.isspace():
                current_ascii_word = False
            else:
                if not current_ascii_word:
                    token_count += 1
                    current_ascii_word = True
                    
        return token_count
