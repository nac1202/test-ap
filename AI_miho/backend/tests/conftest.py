import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.db.models import Base
from app.db.base import set_sqlite_pragma
from sqlalchemy.engine import Engine
from sqlalchemy import event

@pytest.fixture
def db_engine():
    # Use in-memory SQLite with StaticPool so the connection is shared
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    # create all tables
    Base.metadata.create_all(bind=engine)
    yield engine
    # tear down
    Base.metadata.drop_all(bind=engine)
    engine.dispose()

@pytest.fixture
def db_session(db_engine):
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=db_engine)
    session = SessionLocal()
    yield session
    session.close()
