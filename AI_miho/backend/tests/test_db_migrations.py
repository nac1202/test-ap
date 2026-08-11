import os
import sqlite3
import pytest
from alembic.config import Config
from alembic import command
from sqlalchemy import create_engine
from sqlalchemy.exc import IntegrityError

@pytest.fixture
def alembic_config(tmp_path):
    """Create a temporary SQLite DB and provide Alembic config pointing to it."""
    db_path = tmp_path / "test_migration.db"
    db_url = f"sqlite:///{db_path}"
    
    # Alembic expects to be run from the directory containing alembic.ini
    # Our tests run from backend/ directory
    alembic_ini_path = os.path.join(os.path.abspath(os.path.dirname(__file__)), "..", "alembic.ini")
    
    config = Config(alembic_ini_path)
    config.set_main_option("sqlalchemy.url", db_url)
    
    yield config, db_url
    
    try:
        if os.path.exists(db_path):
            os.remove(db_path)
    except PermissionError:
        pass

def test_alembic_upgrade_downgrade(alembic_config):
    config, db_url = alembic_config
    
    # 1. Upgrade to head
    command.upgrade(config, "head")
    
    # Check tables exist
    engine = create_engine(db_url)
    from sqlalchemy import text
    with engine.connect() as conn:
        tables = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table';")).fetchall()
        table_names = [t[0] for t in tables]
        assert "organizations" in table_names
        assert "knowledge_sources" in table_names
        assert "knowledge_embeddings" in table_names
        assert "alembic_version" in table_names

    # 2. Downgrade to base
    command.downgrade(config, "base")
    
    with engine.connect() as conn:
        tables = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table';")).fetchall()
        table_names = [t[0] for t in tables]
        assert "knowledge_sources" not in table_names
    
    engine.dispose()

    # 3. Upgrade back to head (to ensure idempotency)
    command.upgrade(config, "head")

def test_sqlite_foreign_key_enforcement(alembic_config):
    config, db_url = alembic_config
    command.upgrade(config, "head")
    
    # Test that SQLite foreign keys are indeed enforced when PRAGMA foreign_keys=ON
    # wait, the pragma is enforced in our connection event for SQLAlchemy Engine.
    # We should test it through our DB base setup.
    from app.db.base import Base
    from sqlalchemy.orm import sessionmaker
    engine = create_engine(db_url)
    Session = sessionmaker(bind=engine)
    session = Session()
    
    from app.db.models import KnowledgeSource, Organization
    
    # Insert source without org (should fail FK)
    import uuid
    from datetime import datetime, timezone
    
    source = KnowledgeSource(
        id=str(uuid.uuid4()),
        organization_id="nonexistent_org",
        title="Test",
        source_type="document",
        original_filename="a.txt",
        stored_filename="b.txt",
        content_hash="abc",
        mime_type="text/plain",
        file_size=10,
        rights_status="confirmed",
        source_status="active",
        source_series_id="ser1"
    )
    
    session.add(source)
    with pytest.raises(IntegrityError):
        session.flush() # Should raise FK error
        
    session.rollback()
    session.close()
    engine.dispose()
