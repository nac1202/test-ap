import pytest
import os
import json
from pydantic import BaseModel, Field
from app.core.llm.provider import LLMError
from app.core.llm.ollama import OllamaProvider
from app.core.llm.mock import MockProvider
from app.models.model_registry import ModelRegistryEntry

# Test Schema
class DummyAnalysis(BaseModel):
    score: int = Field(..., description="Score 0-100")
    feedback: str = Field(..., description="Feedback string")
    tags: list[str] = Field(default_factory=list)

@pytest.mark.asyncio
async def test_ollama_health_check_no_crash():
    """Test that Ollama health check does not crash even if Ollama is not running."""
    provider = OllamaProvider(base_url="http://localhost:99999") # Invalid port
    is_healthy = await provider.health_check()
    assert is_healthy is False

@pytest.mark.asyncio
async def test_ollama_model_not_found():
    """Test that requesting a non-existent model from Ollama returns a clear Japanese error."""
    provider = OllamaProvider()
    # Skip if real Ollama is actually not running, but if it is, we want a clear error.
    if await provider.health_check():
        with pytest.raises(LLMError) as exc:
            await provider.generate_json_raw("non_existent_model_xyz", "Hello", DummyAnalysis.model_json_schema())
        assert "指定されたモデル（non_existent_model_xyz）が見つかりません" in exc.value.user_message

@pytest.mark.asyncio
async def test_mock_provider_success():
    """Test MockProvider generates JSON validatable by Pydantic."""
    provider = MockProvider()
    
    result = await provider.generate_json("mock-model-1", "Analyze this", DummyAnalysis)
    assert isinstance(result, DummyAnalysis)
    assert result.score == 42
    assert result.feedback == "mock_string"
    assert result.tags == []

@pytest.mark.asyncio
async def test_mock_provider_model_not_found():
    """Test MockProvider handles missing model."""
    provider = MockProvider()
    with pytest.raises(LLMError) as exc:
        await provider.generate_json("non-existent", "Analyze this", DummyAnalysis)
    assert "指定されたモデル（non-existent）が見つかりません" in exc.value.user_message

@pytest.mark.asyncio
async def test_retry_logic_success_on_second_attempt():
    """Test that LLMProvider retries on bad JSON and succeeds if it fixes itself."""
    # MockProvider configured to fail 1 time before success
    provider = MockProvider(fail_count_before_success=1)
    
    result = await provider.generate_json("mock-model-1", "Analyze", DummyAnalysis)
    assert provider.current_attempt == 2 # 1 fail + 1 success
    assert isinstance(result, DummyAnalysis)

@pytest.mark.asyncio
async def test_retry_logic_max_retries_exceeded():
    """Test that LLMProvider stops after max_retries and raises error."""
    # Will always fail since it needs 5 attempts but max_retries is 2
    provider = MockProvider(fail_count_before_success=5)
    
    with pytest.raises(LLMError) as exc:
        await provider.generate_json("mock-model-1", "Analyze", DummyAnalysis, max_retries=2)
    
    assert provider.current_attempt == 3 # initial + 2 retries
    assert "指定された形式でのデータ生成に失敗しました" in exc.value.user_message
    assert "Failed after 2 retries" in exc.value.dev_details

@pytest.mark.asyncio
async def test_model_registry_schema():
    """Test the model registry Pydantic schema default values"""
    entry = ModelRegistryEntry(
        provider="ollama",
        model_id="llama3",
        display_name="Llama 3"
    )
    assert entry.license == "Unconfirmed"
    assert entry.commercial_use_status == "Unconfirmed"
    assert entry.validation_status == "Unconfirmed"
    assert entry.model_version == "Unconfirmed"

# --- list_models Tests with Mocks ---
from unittest.mock import patch, AsyncMock
import httpx

@pytest.mark.asyncio
async def test_list_models_connection_error():
    """Test list_models when Ollama is not running (ConnectError)."""
    provider = OllamaProvider()
    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.side_effect = httpx.ConnectError("Connection refused")
        with pytest.raises(LLMError) as exc:
            await provider.list_models()
        assert "LLM推論サーバー（Ollama）に接続できません" in exc.value.user_message

@pytest.mark.asyncio
async def test_list_models_normal():
    """Test list_models returns a normal model list."""
    provider = OllamaProvider()
    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        req = httpx.Request("GET", "http://localhost")
        mock_response = httpx.Response(200, json={"models": [{"name": "llama3", "digest": "abc"}]}, request=req)
        mock_get.return_value = mock_response
        models = await provider.list_models()
        assert len(models) == 1
        assert models[0].model_id == "llama3"
        assert models[0].model_hash == "abc"
        assert models[0].provider == "ollama"

@pytest.mark.asyncio
async def test_list_models_empty():
    """Test list_models when model list is empty."""
    provider = OllamaProvider()
    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        req = httpx.Request("GET", "http://localhost")
        mock_response = httpx.Response(200, json={"models": []}, request=req)
        mock_get.return_value = mock_response
        models = await provider.list_models()
        assert len(models) == 0

@pytest.mark.asyncio
async def test_list_models_invalid_response():
    """Test list_models when response is invalid (not JSON)."""
    provider = OllamaProvider()
    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        req = httpx.Request("GET", "http://localhost")
        mock_response = httpx.Response(200, text="Not JSON", request=req)
        mock_get.return_value = mock_response
        with pytest.raises(LLMError) as exc:
            await provider.list_models()
        assert "想定外のエラー" in exc.value.user_message

@pytest.mark.asyncio
async def test_list_models_timeout():
    """Test list_models on timeout."""
    provider = OllamaProvider()
    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_get.side_effect = httpx.TimeoutException("Timeout")
        with pytest.raises(LLMError) as exc:
            await provider.list_models()
        assert "タイムアウト" in exc.value.user_message

@pytest.mark.asyncio
async def test_list_models_api_error():
    """Test list_models on API error (e.g., 500)."""
    provider = OllamaProvider()
    with patch("httpx.AsyncClient.get", new_callable=AsyncMock) as mock_get:
        mock_response = httpx.Response(500, request=httpx.Request("GET", "http://localhost"))
        mock_get.side_effect = httpx.HTTPStatusError("Error", request=mock_response.request, response=mock_response)
        with pytest.raises(LLMError) as exc:
            await provider.list_models()
        assert "エラー応答" in exc.value.user_message
