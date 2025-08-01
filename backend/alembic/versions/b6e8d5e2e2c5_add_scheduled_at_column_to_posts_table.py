"""Add scheduled_at column to posts table

Revision ID: b6e8d5e2e2c5
Revises: df47291c362a
Create Date: 2025-07-03 19:57:28.666809

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b6e8d5e2e2c5'
down_revision: Union[str, Sequence[str], None] = 'df47291c362a'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('posts', sa.Column('scheduled_at', sa.DateTime(timezone=True), nullable=True))
    # ### end Alembic commands ###


def downgrade() -> None:
    """Downgrade schema."""
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_column('posts', 'scheduled_at')
    # ### end Alembic commands ###
