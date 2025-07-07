"""make source_channel_id nullable

Revision ID: 001
Revises: 
Create Date: 2024-01-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Make source_channel_id nullable
    with op.batch_alter_table('posts', schema=None) as batch_op:
        batch_op.alter_column('source_channel_id',
                              existing_type=sa.INTEGER(),
                              nullable=True)


def downgrade() -> None:
    # Make source_channel_id not nullable
    with op.batch_alter_table('posts', schema=None) as batch_op:
        batch_op.alter_column('source_channel_id',
                              existing_type=sa.INTEGER(),
                              nullable=False)