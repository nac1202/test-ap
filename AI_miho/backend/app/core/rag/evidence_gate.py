from enum import Enum
from typing import List
from app.core.knowledge.search import SearchResultItem

class GateStatus(Enum):
    SUFFICIENT = "sufficient"
    WEAK = "weak"
    NONE = "none"
    AMBIGUOUS = "ambiguous"
    OUT_OF_SCOPE = "out_of_scope"

class EvidenceGate:
    """
    Evaluates retrieved chunks to determine if the LLM should proceed
    or if the question is out of scope / has no evidence.
    """
    def __init__(
        self,
        min_hybrid_score: float = 0.01,
        min_vector_score: float = 0.8,
        min_keyword_rank: int = 10,
        required_chunks: int = 1
    ):
        self.min_hybrid_score = min_hybrid_score
        self.min_vector_score = min_vector_score
        self.min_keyword_rank = min_keyword_rank
        self.required_chunks = required_chunks

    def evaluate(self, query: str, results: List[SearchResultItem]) -> GateStatus:
        if not results:
            return GateStatus.NONE
            
        top_result = results[0]
        
        # Check if the query is highly unrelated to typical knowledge 
        # (This could also use a fast text classifier or keyword matching, 
        # but for PoC we rely on vector distance and RRF scores)
        
        if top_result.rrf_score < self.min_hybrid_score:
            return GateStatus.OUT_OF_SCOPE
            
        # Check for sufficient evidence
        if len(results) >= self.required_chunks:
            # We assume RRF fusion pushes good results high.
            # If the best result is somewhat okay but not great:
            if top_result.rrf_score < self.min_hybrid_score * 2:
                return GateStatus.WEAK
            return GateStatus.SUFFICIENT
            
        return GateStatus.WEAK
