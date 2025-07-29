"""add rewrite_prompt to target_channels

Revision ID: 002
Revises: 001
Create Date: 2024-12-19 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add rewrite_prompt column to target_channels table
    with op.batch_alter_table('target_channels', schema=None) as batch_op:
        batch_op.add_column(sa.Column('rewrite_prompt', sa.Text(), nullable=True))


def downgrade() -> None:
    # Remove rewrite_prompt column from target_channels table
    with op.batch_alter_table('target_channels', schema=None) as batch_op:
        batch_op.drop_column('rewrite_prompt')