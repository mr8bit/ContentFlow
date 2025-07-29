"""Add LLM classification fields

Revision ID: h4i5j6k7l8m9
Revises: g8h9i0j1k2l3
Create Date: 2024-01-01 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'h4i5j6k7l8m9'
down_revision = 'g8h9i0j1k2l3'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add new fields to target_channels table
    op.add_column('target_channels', sa.Column('description', sa.Text(), nullable=True))
    op.add_column('target_channels', sa.Column('tags', sa.JSON(), nullable=True))
    op.add_column('target_channels', sa.Column('classification_threshold', sa.Integer(), nullable=False, server_default='80'))
    op.add_column('target_channels', sa.Column('auto_publish_enabled', sa.Boolean(), nullable=False, server_default='false'))
    
    # Add LLM classification confidence to posts table
    op.add_column('posts', sa.Column('llm_classification_confidence', sa.Integer(), nullable=True))


def downgrade() -> None:
    # Remove fields from posts table
    op.drop_column('posts', 'llm_classification_confidence')
    
    # Remove fields from target_channels table
    op.drop_column('target_channels', 'auto_publish_enabled')
    op.drop_column('target_channels', 'classification_threshold')
    op.drop_column('target_channels', 'tags')
    op.drop_column('target_channels', 'description')