import os
import faiss
import logging
import hashlib
import numpy as np
from typing import List, Tuple, Dict, Any, Optional
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

class FaissManager:
    def __init__(self, data_dir: str = "data/faiss"):
        self.data_dir = os.path.abspath(data_dir)
        os.makedirs(self.data_dir, exist_ok=True)
        # In-memory cache of loaded indices
        self.indices: Dict[str, faiss.IndexIDMap2] = {}
        
    def _get_index_path(self, organization_id: str) -> str:
        return os.path.join(self.data_dir, f"org_{organization_id}.index")

    def _compute_checksum(self, filepath: str) -> str:
        sha256_hash = hashlib.sha256()
        with open(filepath, "rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()

    def build_and_save_index(self, organization_id: str, embeddings: np.ndarray, faiss_ids: np.ndarray) -> Tuple[bool, Optional[str], int]:
        """
        Build a FAISS index and safely save it with checksum verification.
        Returns: (success, checksum, vector_count)
        """
        if embeddings.shape[0] != faiss_ids.shape[0]:
            logger.error("Embeddings and IDs count mismatch.")
            return False, None, 0
            
        vector_count = embeddings.shape[0]
        if vector_count == 0:
            logger.warning(f"No vectors to build index for org {organization_id}")
            return False, None, 0
            
        dimension = embeddings.shape[1]
        
        # FAISS index with L2 normalized vectors uses Inner Product for cosine similarity
        quantizer = faiss.IndexFlatIP(dimension)
        index = faiss.IndexIDMap2(quantizer)
        
        # Add to index
        index.add_with_ids(embeddings, faiss_ids)
        
        # Save to temporary file
        tmp_path = self._get_index_path(organization_id) + ".tmp"
        final_path = self._get_index_path(organization_id)
        
        try:
            faiss.write_index(index, tmp_path)
            
            # Read back to verify
            test_index = faiss.read_index(tmp_path)
            if test_index.ntotal != vector_count:
                raise ValueError("Verification failed: Vector count mismatch after write.")
                
            checksum = self._compute_checksum(tmp_path)
            
            # Atomic replace
            if os.path.exists(final_path):
                # Optionally backup
                os.replace(final_path, final_path + ".bak")
            os.replace(tmp_path, final_path)
            
            # Update cache
            self.indices[organization_id] = test_index
            return True, checksum, vector_count
            
        except Exception as e:
            logger.error(f"Failed to build FAISS index for {organization_id}: {e}")
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
            return False, None, 0

    def load_index(self, organization_id: str) -> Optional[faiss.IndexIDMap2]:
        """Load index from disk or cache."""
        if organization_id in self.indices:
            return self.indices[organization_id]
            
        filepath = self._get_index_path(organization_id)
        if not os.path.exists(filepath):
            return None
            
        try:
            index = faiss.read_index(filepath)
            self.indices[organization_id] = index
            return index
        except Exception as e:
            logger.error(f"Failed to load FAISS index from {filepath}: {e}")
            return None

    def search(self, organization_id: str, query_vector: List[float], limit: int = 10, filter_faiss_ids: Optional[List[int]] = None) -> List[Tuple[int, float]]:
        """
        Search in FAISS index.
        Returns list of (faiss_id, distance/score)
        """
        index = self.load_index(organization_id)
        if index is None or index.ntotal == 0:
            return []
            
        # Ensure query is float32 numpy array, 2D
        q_np = np.array([query_vector], dtype=np.float32)
        
        # Apply pre-filtering using IDSelector if provided
        sel = None
        if filter_faiss_ids is not None:
            if not filter_faiss_ids:
                return [] # Filter is empty, no possible matches
            # FAISS IDSelectorArray requires int64
            filter_arr = np.array(filter_faiss_ids, dtype=np.int64)
            sel = faiss.IDSelectorArray(filter_arr)
            
        search_params = faiss.SearchParametersIVF(sel=sel) if sel else None
        
        # If we use IndexFlatIP, IDSelector works slightly differently depending on faiss version,
        # but IndexIDMap2 supports it via search parameters in newer versions, or we just filter post-search
        # Alternatively, since it's an exact search (Flat), we can just retrieve a larger top_k and filter manually if IDSelector is not supported.
        # But `IDSelector` with `IndexIDMap2(IndexFlatIP)` works in recent FAISS.
        try:
            if sel:
                # search_params can be passed to search in recent FAISS
                scores, ids = index.search(q_np, limit, params=search_params)
            else:
                scores, ids = index.search(q_np, limit)
        except TypeError:
            # Fallback if params argument is not supported
            logger.warning("FAISS search with IDSelector params failed, falling back to manual post-filter")
            large_limit = min(index.ntotal, max(limit * 10, 1000))
            scores, ids = index.search(q_np, large_limit)
            
            filtered_results = []
            for i in range(len(ids[0])):
                fid = int(ids[0][i])
                if fid == -1:
                    continue
                if filter_faiss_ids is None or fid in filter_faiss_ids:
                    filtered_results.append((fid, float(scores[0][i])))
                    if len(filtered_results) >= limit:
                        break
            return filtered_results
            
        # Process standard results
        results = []
        for i in range(len(ids[0])):
            fid = int(ids[0][i])
            if fid != -1:
                results.append((fid, float(scores[0][i])))
                
        return results
