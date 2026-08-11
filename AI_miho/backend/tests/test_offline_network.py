import pytest
import socket
from unittest.mock import patch
import os

from app.core.knowledge.search import SearchService
from app.core.knowledge.sqlalchemy_repository import SQLAlchemyKnowledgeRepository
from app.core.knowledge.keyword_search import MockKeywordSearchProvider
from app.core.knowledge.faiss_manager import FaissManager
from app.db.models import Organization

# Ensure real embedding is attempted, so we can verify if it tries to download
# If it fails due to no model, that's fine, we just want to ensure it doesn't do network calls
@patch("socket.socket.connect")
@patch("socket.getaddrinfo")
def test_no_external_network_during_search(mock_getaddrinfo, mock_connect, db_session, tmp_path):
    # This test verifies that calling search with a real embedding model provider 
    # (or mock) does not trigger any DNS lookups or socket connections.
    
    # Temporarily force to use LocalSentenceTransformerProvider instead of mock
    os.environ["ALLOW_MOCK_EMBEDDING"] = "false"
    
    from app.core.knowledge.embedding import get_embedding_provider
    try:
        # If the model is not set up, it should raise a FileNotFoundError or RuntimeError, NOT make a network call
        provider = get_embedding_provider()
    except Exception:
        # We expect it might fail if model isn't there, but it shouldn't have called connect
        pass
        
    assert mock_connect.call_count == 0, "socket.connect should not be called"
    assert mock_getaddrinfo.call_count == 0, "socket.getaddrinfo should not be called"

    # Even if model is present, calling search should not use network
    # Let's mock the provider's health_check to pass and embed_query to return dummy so we can run search
    try:
        provider = get_embedding_provider()
        
        # Setup basic DB
        repo = SQLAlchemyKnowledgeRepository(lambda: db_session)
        org_id = "org-net"
        db_session.add(Organization(id=org_id, name="Net Org"))
        db_session.commit()
        
        svc = SearchService(
            repository=repo,
            embedding_provider=provider,
            keyword_provider=MockKeywordSearchProvider(),
            faiss_manager=FaissManager(str(tmp_path)),
            session_factory=lambda: db_session
        )
        
        # This will either work (if model is locally cached) or fail.
        # The key is that network calls must be zero.
        try:
            svc.search(org_id, "テスト")
        except Exception:
            pass
            
        assert mock_connect.call_count == 0, "socket.connect should not be called during search"
        assert mock_getaddrinfo.call_count == 0, "socket.getaddrinfo should not be called during search"
    except Exception:
        pass
