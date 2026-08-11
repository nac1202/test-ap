import json
from typing import List
from app.core.llm.provider import LLMProvider, LLMError
from app.models.model_registry import ModelRegistryEntry

class MockProvider(LLMProvider):
    """
    Mock LLM Provider for testing environments without an actual LLM server.
    """
    def __init__(self, should_fail_health: bool = False, fail_count_before_success: int = 0):
        self.should_fail_health = should_fail_health
        self.fail_count_before_success = fail_count_before_success
        self.current_attempt = 0

    async def health_check(self) -> bool:
        return not self.should_fail_health

    async def list_models(self) -> List[ModelRegistryEntry]:
        if self.should_fail_health:
            raise LLMError(
                user_message="LLM推論サーバーに接続できません。",
                dev_details="MockProvider simulated connection error."
            )
        return [
            ModelRegistryEntry(
                provider="mock",
                model_id="mock-model-1",
                display_name="Mock Model 1",
                model_version="1.0",
                model_hash="dummy_hash_123",
                license="MIT",
                commercial_use_status="allowed",
                installation_status="installed",
                validation_status="validated"
            )
        ]

    async def generate_json_raw(self, model_id: str, messages: List[dict], schema: dict) -> str:
        """
        Generates a dummy JSON string based on the schema properties to simulate LLM structured output.
        """
        if model_id != "mock-model-1":
            raise LLMError(
                user_message=f"指定されたモデル（{model_id}）が見つかりません。",
                dev_details=f"MockProvider simulated model not found for {model_id}."
            )

        self.current_attempt += 1
        
        # Simulate bad JSON for retries testing
        if self.current_attempt <= self.fail_count_before_success:
            return '{"invalid_json": "missing_quote}'

        # Generate a valid dummy JSON matching the top-level keys of the schema
        # In a real mock, this might be more sophisticated, but this is enough to prove the pipeline.
        properties = schema.get("properties", {})
        dummy_response = {}
        for key, value in properties.items():
            if key == "evidence_summary":
                dummy_response[key] = None
                continue
            
            t = value.get("type", "string")
            if t == "string":
                dummy_response[key] = "mock_string"
            elif t == "integer":
                dummy_response[key] = 42
            elif t == "boolean":
                dummy_response[key] = True
            elif t == "array":
                dummy_response[key] = []
            elif t == "object" or "$ref" in value:
                dummy_response[key] = None # Nested objects aren't properly mocked, so use None or {}
            else:
                dummy_response[key] = None

        return json.dumps(dummy_response)
