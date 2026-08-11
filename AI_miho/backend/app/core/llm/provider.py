import logging
import json
from abc import ABC, abstractmethod
from typing import TypeVar, Type, List, Dict, Any, Optional

from pydantic import BaseModel, ValidationError
from app.models.model_registry import ModelRegistryEntry

T = TypeVar('T', bound=BaseModel)
logger = logging.getLogger(__name__)

class LLMError(Exception):
    """Base exception for LLM errors"""
    def __init__(self, user_message: str, dev_details: str):
        self.user_message = user_message
        self.dev_details = dev_details
        super().__init__(self.user_message)

class LLMProvider(ABC):
    """Abstract interface for LLM providers."""
    
    @abstractmethod
    async def health_check(self) -> bool:
        """Check if the provider is available."""
        pass

    @abstractmethod
    async def list_models(self) -> List[ModelRegistryEntry]:
        """List available models from the provider."""
        pass

    @abstractmethod
    async def generate_json_raw(self, model_id: str, messages: List[Dict[str, str]], schema: dict) -> str:
        """
        Generate raw JSON string based on messages and schema.
        Implementation should pass the schema to the underlying API (e.g., Ollama 'format').
        """
        pass

    async def generate_json(self, model_id: str, messages: List[Dict[str, str]], response_model: Type[T], max_retries: int = 2) -> T:
        """
        Generate a JSON response and validate it with Pydantic.
        Retries up to max_retries times if validation fails.
        """
        schema = response_model.model_json_schema()
        attempts = 0
        last_dev_error = ""

        # Copy messages to allow augmenting it during retries without mutating the original
        augmented_messages = list(messages)

        while attempts <= max_retries:
            try:
                raw_response = await self.generate_json_raw(model_id, augmented_messages, schema)
                # Parse JSON and validate
                parsed_json = json.loads(raw_response)
                validated_data = response_model.model_validate(parsed_json)
                return validated_data
            except json.JSONDecodeError as e:
                last_dev_error = f"JSON decode error: {str(e)}. Raw response: {raw_response}"
                logger.warning(f"Attempt {attempts + 1} failed: {last_dev_error}")
                augmented_messages.append({"role": "user", "content": "システムエラー: 前回は無効なJSONが返されました。必ず指定されたJSONスキーマに厳密に従って出力してください。"})
            except ValidationError as e:
                last_dev_error = f"Pydantic validation error: {str(e)}. Raw response: {raw_response}"
                logger.warning(f"Attempt {attempts + 1} failed: {last_dev_error}")
                augmented_messages.append({"role": "user", "content": f"システムエラー: 前回の出力はスキーマ検証に失敗しました。以下のエラーを修正してください: {str(e)}"})
            except LLMError:
                raise
            except Exception as e:
                # Other exceptions (e.g., network error, model not found) should fail immediately
                last_dev_error = f"Provider error: {str(e)}"
                logger.error(f"Provider error: {last_dev_error}")
                raise LLMError(
                    user_message="AIによる分析中にエラーが発生しました。しばらく経ってから再度お試しください。",
                    dev_details=last_dev_error
                )
            
            attempts += 1
            
        # Final failure after retries
        logger.error(f"Max retries reached. Last error: {last_dev_error}")
        raise LLMError(
            user_message="指定された形式でのデータ生成に失敗しました。入力内容を確認するか、後でもう一度お試しください。",
            dev_details=f"Failed after {max_retries} retries. Last error: {last_dev_error}"
        )

class LLMProviderFactory:
    """Factory to create LLMProvider instances based on configuration."""
    
    @staticmethod
    def create() -> LLMProvider:
        import os
        provider_name = os.environ.get("LLM_PROVIDER", "ollama").lower()
        
        if provider_name == "azure_openai":
            from app.core.llm.azure_openai import AzureOpenAIProvider
            return AzureOpenAIProvider()
        elif provider_name == "mock":
            from app.core.llm.mock import MockProvider
            return MockProvider()
        else:
            from app.core.llm.ollama import OllamaProvider
            return OllamaProvider()
