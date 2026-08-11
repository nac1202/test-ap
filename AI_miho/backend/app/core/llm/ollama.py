import os
import httpx
from typing import List
from urllib.parse import urlparse
from app.core.llm.provider import LLMProvider, LLMError
from app.models.model_registry import ModelRegistryEntry

def validate_ollama_url(url: str) -> str:
    """Validate Ollama URL to prevent SSRF and external connections."""
    parsed = urlparse(url)
    
    if parsed.scheme not in ('http', 'https'):
        raise ValueError("Invalid URL scheme. Only http and https are allowed.")
    
    if parsed.username or parsed.password:
        raise ValueError("Credentials in URL are not allowed.")
        
    allowed_hosts = ['localhost', '127.0.0.1', '[::1]', '::1']
    # If there's an organization specific internal hostname, it should be added to allowed_hosts via secure config
    
    if parsed.hostname not in allowed_hosts:
        raise ValueError(f"Host {parsed.hostname} is not allowed. Only local connections are permitted by default.")
        
    return url

class OllamaProvider(LLMProvider):
    def __init__(self, base_url: str = None):
        # Do not hardcode URL. Use environment variable or default
        raw_url = base_url or os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
        try:
            self.base_url = validate_ollama_url(raw_url)
        except ValueError as e:
            # Raise a safe LLMError that won't leak details to general users
            raise LLMError(
                user_message="システムのLLM設定に問題があります。システム管理者に連絡してください。",
                dev_details=f"Ollama URL validation failed: {str(e)}"
            )
            
        # Separate timeouts: connect=5.0s, read=60.0s, write=10.0s, pool=5.0s
        self.timeout = httpx.Timeout(60.0, connect=5.0)

    async def health_check(self) -> bool:
        """Check if Ollama server is running."""
        try:
            async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=False) as client:
                response = await client.get(f"{self.base_url}/api/tags")
                return response.status_code == 200
        except Exception:
            return False

    async def list_models(self) -> List[ModelRegistryEntry]:
        """List available models from Ollama."""
        try:
            async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=False) as client:
                response = await client.get(f"{self.base_url}/api/tags")
                response.raise_for_status()
                data = response.json()
                models = []
                for m in data.get("models", []):
                    # Ollama does not provide license or commercial use status from the /api/tags endpoint reliably.
                    # We only record what we know, leaving others as "Unconfirmed".
                    model_id = m.get("name")
                    models.append(ModelRegistryEntry(
                        provider="ollama",
                        model_id=model_id,
                        display_name=model_id,
                        model_hash=m.get("digest", "Unconfirmed"),
                        model_version="Unconfirmed",
                        license="Unconfirmed",
                        commercial_use_status="Unconfirmed",
                        installation_status="installed",
                        validation_status="Unconfirmed"
                    ))
                return models
        except httpx.TimeoutException as e:
            raise LLMError(
                user_message="LLM推論サーバーからの応答がタイムアウトしました。",
                dev_details=f"Ollama timeout during list_models: {str(e)}"
            )
        except httpx.ConnectError as e:
            raise LLMError(
                user_message="LLM推論サーバー（Ollama）に接続できません。システム管理者に連絡してください。",
                dev_details=f"Connection error to Ollama at {self.base_url}: {str(e)}"
            )
        except httpx.HTTPStatusError as e:
            raise LLMError(
                user_message="LLM推論サーバーからエラー応答がありました。",
                dev_details=f"Ollama HTTP error {e.response.status_code} during list_models."
            )
        except Exception as e:
            raise LLMError(
                user_message="モデル一覧の取得中に想定外のエラーが発生しました。",
                dev_details=f"Ollama list_models error: {str(e)}"
            )

    async def generate_json_raw(self, model_id: str, messages: List[Dict[str, str]], schema: dict) -> str:
        """Call Ollama API with format parameter for JSON Structured Output."""
        try:
            async with httpx.AsyncClient(timeout=self.timeout, follow_redirects=False) as client:
                payload = {
                    "model": model_id,
                    "messages": messages,
                    "format": schema,
                    "stream": False
                }
                response = await client.post(
                    f"{self.base_url}/api/chat",
                    json=payload
                )
                
                if response.status_code == 404:
                    raise LLMError(
                        user_message=f"指定されたモデル（{model_id}）が見つかりません。モデルが正しく導入されているか確認してください。",
                        dev_details=f"Model {model_id} not found in Ollama."
                    )
                
                response.raise_for_status()
                data = response.json()
                return data.get("message", {}).get("content", "")
                
        except httpx.TimeoutException as e:
            raise LLMError(
                user_message="LLM推論処理がタイムアウトしました。しばらく経ってから再度お試しください。",
                dev_details=f"Ollama generation timeout: {str(e)}"
            )
        except httpx.ConnectError as e:
            raise LLMError(
                user_message="LLM推論サーバー（Ollama）に接続できません。システム管理者に連絡してください。",
                dev_details=f"Connection error to Ollama at {self.base_url}: {str(e)}"
            )
        except httpx.HTTPStatusError as e:
            raise LLMError(
                user_message="LLM推論サーバーからエラー応答がありました。",
                dev_details=f"Ollama HTTP error {e.response.status_code} during generate."
            )
        except LLMError:
            raise
        except Exception as e:
            raise LLMError(
                user_message="AIによる分析処理中に想定外のエラーが発生しました。",
                dev_details=f"Ollama generate_json_raw error: {str(e)}"
            )
