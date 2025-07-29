"""Merge heads

Revision ID: 591991aec511
Revises: 001, h4i5j6k7l8m9
Create Date: 2025-07-07 14:50:25.168252

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '591991aec511'
down_revision: Union[str, Sequence[str], None] = ('001', 'h4i5j6k7l8m9')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
