import os
import json
import logging
from typing import List, Dict, Any
import openai
from openai import AsyncAzureOpenAI, AsyncOpenAI

from app.core.llm.provider import LLMProvider, LLMError
from app.models.model_registry import ModelRegistryEntry

logger = logging.getLogger(__name__)

class AzureOpenAIProvider(LLMProvider):
    def __init__(self):
        self.api_key = os.environ.get("AZURE_OPENAI_API_KEY")
        self.endpoint = os.environ.get("AZURE_OPENAI_ENDPOINT")
        self.api_version = os.environ.get("AZURE_OPENAI_API_VERSION")
        
        if self.api_key and self.endpoint:
            if self.api_version:
                # 従来のAzure専用クライアント（API Version必須）
                self.client = AsyncAzureOpenAI(
                    api_key=self.api_key,
                    azure_endpoint=self.endpoint,
                    api_version=self.api_version,
                    timeout=30.0,
                    max_retries=2
                )
            else:
                # Microsoft Foundry / OpenAI互換のv1 API方式
                # base_urlに渡されるエンドポイントは ".../openai/v1/" などを想定
                self.client = AsyncOpenAI(
                    api_key=self.api_key,
                    base_url=self.endpoint,
                    default_headers={"api-key": self.api_key},
                    timeout=30.0,
                    max_retries=2
                )
        else:
            self.client = None
            logger.warning("Azure OpenAI credentials not found in environment variables. Provider will fail if used.")

    async def health_check(self) -> bool:
        """Check if Azure OpenAI is configured and available (dummy check)."""
        return self.client is not None

    async def list_models(self) -> List[ModelRegistryEntry]:
        """List models (For Azure OpenAI, this is usually fixed per deployment, returning a dummy list for compatibility)."""
        return [
            ModelRegistryEntry(
                provider="azure_openai",
                model_id="gpt-4o",
                display_name="GPT-4o (Azure)",
                model_hash="N/A",
                model_version="N/A",
                license="Proprietary",
                commercial_use_status="Allowed",
                installation_status="cloud",
                validation_status="Unconfirmed"
            )
        ]

    async def generate_json_raw(self, model_id: str, messages: List[Dict[str, str]], schema: dict) -> str:
        """Call Azure OpenAI API with JSON mode or Structured Outputs."""
        if not self.client:
            raise LLMError(
                user_message="システムの設定に問題があり、クラウドAIに接続できません。管理者にご連絡ください。",
                dev_details="AZURE_OPENAI_API_KEY or AZURE_OPENAI_ENDPOINT is not set."
            )
        
        # Azure OpenAI deployment name is passed as `model`
        deployment_name = os.environ.get("AZURE_OPENAI_DEPLOYMENT_NAME", model_id)
        
        try:
            # We use strict JSON Schema format if possible, otherwise we might fallback to json_object.
            # In latest API versions, json_schema is supported.
            response = await self.client.chat.completions.create(
                model=deployment_name,
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
            
            content = response.choices[0].message.content
            if not content:
                raise ValueError("Empty response from Azure OpenAI.")
            return content
            
        except openai.APIConnectionError as e:
            logger.error(f"Azure OpenAI Connection Error: {e}")
            raise LLMError(
                user_message="クラウドAIとの通信に失敗しました。ネットワーク状況を確認してください。",
                dev_details=str(e)
            )
        except openai.RateLimitError as e:
            logger.error(f"Azure OpenAI Rate Limit Error: {e}")
            raise LLMError(
                user_message="クラウドAIの利用制限（レートリミット）に到達しました。しばらく待ってから再試行してください。",
                dev_details=str(e)
            )
        except openai.APIStatusError as e:
            logger.error(f"Azure OpenAI API Error: {e.status_code} - {e.response}")
            raise LLMError(
                user_message="クラウドAI側でエラーが発生しました。",
                dev_details=f"Status code: {e.status_code}, Message: {str(e)}"
            )
        except Exception as e:
            logger.error(f"Azure OpenAI Unexpected Error: {e}")
            raise LLMError(
                user_message="AIによる分析処理中にクラウド連携エラーが発生しました。",
                dev_details=f"Azure OpenAI unexpected error: {str(e)}"
            )
