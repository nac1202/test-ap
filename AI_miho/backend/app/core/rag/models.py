from pydantic import BaseModel, Field
from typing import List, Optional

class Citation(BaseModel):
    source_id: str = Field(description="The source ID of the knowledge chunk cited")
    chunk_id: str = Field(description="The short chunk ID (e.g., K1, K2) cited")
    page_start: Optional[int] = Field(default=None, description="The starting page number of the citation")
    page_end: Optional[int] = Field(default=None, description="The ending page number of the citation")
    supports_claims: List[str] = Field(description="List of claim_ids that this citation supports")

class Claim(BaseModel):
    claim_id: str = Field(description="A unique ID for this claim (e.g., claim-1)")
    text: str = Field(description="The factual claim made in the answer")
    citation_chunk_ids: List[str] = Field(description="List of short chunk IDs (e.g., K1) that support this claim")

class EvidenceSummary(BaseModel):
    gate_status: str = Field(description="The status of evidence gating (e.g., sufficient, weak, none, out_of_scope)")
    retrieved_count: int = Field(description="The number of chunks retrieved")
    used_chunk_ids: List[str] = Field(description="List of chunk IDs used for the answer")

class RAGResponse(BaseModel):
    answer: str = Field(description="The detailed answer generated in Japanese. Return '登録された知識内に、回答の根拠となる情報が見つかりませんでした。' if no_evidence or out_of_scope.")
    answer_status: str = Field(description="The status of the answer: grounded, weak, no_evidence, ambiguous, out_of_scope")
    confidence: str = Field(description="Confidence level: high, medium, low")
    clarification_question: Optional[str] = Field(default=None, description="A question to clarify the user's intent if ambiguous")
    citations: List[Citation] = Field(description="List of citations used in the answer")
    claims: List[Claim] = Field(description="List of factual claims made in the answer, mapped to citations")
    warnings: List[str] = Field(description="Any warnings about the generation process")
    evidence_summary: Optional[EvidenceSummary] = Field(default=None, description="Summary of evidence (filled by the application, not the LLM)")
