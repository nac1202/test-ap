import os
import logging
from abc import ABC, abstractmethod
from typing import List, Optional

logger = logging.getLogger(__name__)

class EmbeddingProvider(ABC):
    @abstractmethod
    def health_check(self) -> bool:
        """Check if the provider is ready to generate embeddings."""
        pass

    @abstractmethod
    def embed_query(self, text: str) -> List[float]:
        """Embed a search query."""
        pass

    @abstractmethod
    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """Embed a list of documents (knowledge chunks)."""
        pass

    @abstractmethod
    def dimension(self) -> int:
        """Return the dimension of the embeddings."""
        pass


class MockEmbeddingProvider(EmbeddingProvider):
    """
    Mock provider for testing or demo environments when the actual model is not downloaded.
    Produces random deterministic embeddings.
    """
    def __init__(self, dimension: int = 384):
        self._dim = dimension

    def health_check(self) -> bool:
        return True

    def _generate_mock_vector(self, text: str) -> List[float]:
        import hashlib
        import math
        # Generate a deterministic pseudo-random vector based on text
        # Using a smaller hash to prevent float precision loss in math.sin
        hash_hex = hashlib.md5(text.encode('utf-8')).hexdigest()
        hash_val = int(hash_hex[:8], 16) # use first 8 hex chars (32-bit int)
        
        vec = []
        for i in range(self._dim):
            # Simple pseudo-random using sin
            val = math.sin(hash_val * (i + 1))
            vec.append(val)
            
        # L2 normalize
        norm = math.sqrt(sum(v * v for v in vec))
        if norm == 0:
            norm = 1.0
        return [v / norm for v in vec]

    def embed_query(self, text: str) -> List[float]:
        return self._generate_mock_vector(f"query: {text}")

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        return [self._generate_mock_vector(f"passage: {t}") for t in texts]

    def dimension(self) -> int:
        return self._dim


class LocalSentenceTransformerProvider(EmbeddingProvider):
    def __init__(self, model_name: str = "intfloat/multilingual-e5-small"):
        self.model_name = model_name
        self.model = None
        self._dim = 384  # e5-small dimension
        self.manifest = None
        
        # Determine model root
        root_dir = os.environ.get("EMBEDDING_MODEL_ROOT", "data/models")
        
        # Absolute path resolution
        if not os.path.isabs(root_dir):
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
            root_dir = os.path.join(base_dir, root_dir)
            
        self.root_dir = os.path.abspath(root_dir)
        self.model_path = os.path.abspath(os.path.join(self.root_dir, model_name.replace("/", "--")))
        
        # Directory traversal prevention
        if not self.model_path.startswith(self.root_dir):
            raise PermissionError("Model path is outside of the permitted root directory.")
            
    def _verify_manifest(self):
        manifest_path = os.path.join(self.model_path, "manifest.json")
        if not os.path.exists(manifest_path):
            raise FileNotFoundError(f"ローカル埋め込みモデルの検証に失敗しました。manifest.json が見つかりません: {manifest_path}")
            
        import json
        import hashlib
        try:
            with open(manifest_path, "r", encoding="utf-8") as f:
                self.manifest = json.load(f)
        except json.JSONDecodeError:
            raise ValueError("manifest.json の形式が不正です。")
            
        # Optional: Deep hash verification can be done here, but might be slow on every load.
        # We will do a basic check that expected files exist.
        for rel_path in self.manifest.get("files", {}).keys():
            expected_path = os.path.join(self.model_path, rel_path)
            if not os.path.exists(expected_path):
                raise FileNotFoundError(f"モデルファイルが欠損しています: {rel_path}")

    def _load_model(self):
        if self.model is not None:
            return
            
        if not os.path.exists(self.model_path):
            raise FileNotFoundError("ローカル埋め込みモデルが配置されていないため、検索を実行できません。管理者による setup_model.py の実行が必要です。")
            
        self._verify_manifest()
            
        try:
            import time
            start_time = time.time()
            from sentence_transformers import SentenceTransformer
            # local_files_only=True guarantees no external network calls
            self.model = SentenceTransformer(self.model_path, local_files_only=True, trust_remote_code=False)
            
            # Verify dimension
            dim = self.model.get_sentence_embedding_dimension()
            if dim != 384:
                logger.warning(f"Expected dimension 384 for E5-small, but got {dim}.")
            self._dim = dim
            
            elapsed = time.time() - start_time
            logger.info(f"[実モデル使用中] モデル {self.model_name} の読み込みが完了しました。所要時間: {elapsed:.2f}秒, 次元数: {self._dim}")
        except Exception as e:
            logger.error(f"Failed to load SentenceTransformer model: {e}")
            raise

    def health_check(self) -> bool:
        try:
            if not os.path.exists(self.model_path):
                return False
            self._load_model()
            return True
        except Exception:
            return False

    def embed_query(self, text: str) -> List[float]:
        self._load_model()
        
        # Empty string handling
        text = text.strip()
        if not text:
            # Return zero vector or minimal valid vector for empty text
            return [0.0] * self._dim
            
        # E5 specific prefix prevention (prevent double prefix)
        if text.startswith("query: "):
            query_text = text
        else:
            query_text = f"query: {text}"
            
        # encode returns numpy array
        embedding = self.model.encode(query_text, normalize_embeddings=True)
        return embedding.tolist()

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        self._load_model()
        
        passage_texts = []
        for t in texts:
            t = t.strip()
            if not t:
                passage_texts.append("passage: ") # Default empty passage
            elif t.startswith("passage: "):
                passage_texts.append(t)
            else:
                passage_texts.append(f"passage: {t}")
                
        embeddings = self.model.encode(passage_texts, normalize_embeddings=True)
        return [emb.tolist() for emb in embeddings]

    def dimension(self) -> int:
        if self.model is not None:
            return self.model.get_sentence_embedding_dimension()
        return self._dim

def get_embedding_provider(model_name: str = "intfloat/multilingual-e5-small") -> EmbeddingProvider:
    """Factory to get the appropriate embedding provider."""
    provider = LocalSentenceTransformerProvider(model_name=model_name)
    
    if not provider.health_check():
        allow_mock = os.environ.get("ALLOW_MOCK_EMBEDDING", "false").lower() == "true"
        if allow_mock:
            logger.warning("========================================")
            logger.warning("埋め込み方式：Mock")
            logger.warning("実モデルではありません")
            logger.warning("検索基盤の動作確認専用です")
            logger.warning("========================================")
            return MockEmbeddingProvider()
        else:
            raise RuntimeError("ローカル埋め込みモデルが配置されていないため、検索を実行できません。")
            
    return provider
