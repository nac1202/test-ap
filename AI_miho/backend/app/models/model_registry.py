from datetime import datetime, timezone
from typing import Optional
from pydantic import BaseModel, Field

class ModelRegistryEntry(BaseModel):
    provider: str = Field(..., description="LLM provider, e.g., 'ollama', 'mock'")
    model_id: str = Field(..., description="Internal or provider-specific model ID, e.g., 'llama3'")
    display_name: str = Field(..., description="Human readable name")
    model_version: str = Field(default="Unconfirmed", description="Model version")
    model_hash: str = Field(default="Unconfirmed", description="Hash of the model file if available")
    license: str = Field(default="Unconfirmed", description="License of the model")
    commercial_use_status: str = Field(default="Unconfirmed", description="Whether commercial use is allowed")
    installation_status: str = Field(default="Unconfirmed", description="Status of installation (e.g., 'installed', 'not_installed')")
    validation_status: str = Field(default="Unconfirmed", description="Whether the model is validated to work correctly")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="Record creation time")
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="Record update time")
