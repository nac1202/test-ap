"""add_fts5_table

Revision ID: fdb5b5cd8720
Revises: ad7a4c76e4c8
Create Date: 2026-06-25 19:53:31.507304

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fdb5b5cd8720'
down_revision: Union[str, Sequence[str], None] = 'ad7a4c76e4c8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("""
    CREATE VIRTUAL TABLE IF NOT EXISTS knowledge_chunks_fts USING fts5(
        chunk_id UNINDEXED,
        text,
        heading,
        chapter,
        section,
        tokenize='trigram'
    );
    """)
    op.execute("""
    CREATE TRIGGER IF NOT EXISTS knowledge_chunks_ai AFTER INSERT ON knowledge_chunks
    BEGIN
        INSERT INTO knowledge_chunks_fts (chunk_id, text, heading, chapter, section) 
        VALUES (
            new.id, 
            new.text, 
            new.heading_path, 
            json_extract(new.heading_path, '$[0]'), 
            json_extract(new.heading_path, '$[1]')
        );
    END;
    """)
    op.execute("""
    CREATE TRIGGER IF NOT EXISTS knowledge_chunks_ad AFTER DELETE ON knowledge_chunks
    BEGIN
        DELETE FROM knowledge_chunks_fts WHERE chunk_id = old.id;
    END;
    """)
    op.execute("""
    CREATE TRIGGER IF NOT EXISTS knowledge_chunks_au AFTER UPDATE ON knowledge_chunks
    BEGIN
        DELETE FROM knowledge_chunks_fts WHERE chunk_id = old.id;
        INSERT INTO knowledge_chunks_fts (chunk_id, text, heading, chapter, section) 
        VALUES (
            new.id, 
            new.text, 
            new.heading_path, 
            json_extract(new.heading_path, '$[0]'), 
            json_extract(new.heading_path, '$[1]')
        );
    END;
    """)
    # 既存のデータをFTSに反映
    op.execute("""
    INSERT INTO knowledge_chunks_fts (chunk_id, text, heading, chapter, section)
    SELECT id, text, heading_path, json_extract(heading_path, '$[0]'), json_extract(heading_path, '$[1]')
    FROM knowledge_chunks;
    """)


def downgrade() -> None:
    """Downgrade schema."""
    op.execute("DROP TRIGGER IF EXISTS knowledge_chunks_ai;")
    op.execute("DROP TRIGGER IF EXISTS knowledge_chunks_ad;")
    op.execute("DROP TRIGGER IF EXISTS knowledge_chunks_au;")
    op.execute("DROP TABLE IF EXISTS knowledge_chunks_fts;")
