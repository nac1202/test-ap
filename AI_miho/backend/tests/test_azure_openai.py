import os
import pytest
from unittest.mock import patch, MagicMock, AsyncMock

from app.core.llm.azure_openai import AzureOpenAIProvider
from app.core.llm.provider import LLMError

@pytest.fixture
def mock_env():
    with patch.dict(os.environ, {
        "AZURE_OPENAI_API_KEY": "test_key",
        "AZURE_OPENAI_ENDPOINT": "https://test.openai.azure.com",
        "AZURE_OPENAI_API_VERSION": "2024-08-01-preview",
        "AZURE_OPENAI_DEPLOYMENT_NAME": "test_deployment"
    }):
        yield

@pytest.fixture
def mock_env_missing():
    with patch.dict(os.environ, {}, clear=True):
        yield

@pytest.mark.asyncio
async def test_azure_openai_init_missing_env(mock_env_missing):
    provider = AzureOpenAIProvider()
    assert provider.client is None
    
    # generate_json_raw should raise LLMError
    with pytest.raises(LLMError) as exc_info:
        await provider.generate_json_raw("model", [], {})
    assert "システムの設定に問題があり" in exc_info.value.user_message

@pytest.mark.asyncio
async def test_azure_openai_generate_json_raw(mock_env):
    provider = AzureOpenAIProvider()
    assert provider.client is not None
    
    # Mock the AsyncAzureOpenAI client
    mock_response = MagicMock()
    mock_choice = MagicMock()
    mock_choice.message.content = '{"answer": "テスト回答"}'
    mock_response.choices = [mock_choice]
    
    provider.client.chat.completions.create = AsyncMock(return_value=mock_response)
    
    schema = {"type": "object", "properties": {"answer": {"type": "string"}}}
    messages = [{"role": "user", "content": "hello"}]
    
    result = await provider.generate_json_raw("test_model", messages, schema)
    assert result == '{"answer": "テスト回答"}'
    
    # Verify the API was called with correct parameters
    provider.client.chat.completions.create.assert_called_once_with(
        model="test_deployment",
        messages=messages,
        response_format={
            "type": "json_schema",
            "json_schema": {
                "name": "structured_response",
                "schema": schema,
                "strict": True
            }
        },
        temperature=0.0
    )
