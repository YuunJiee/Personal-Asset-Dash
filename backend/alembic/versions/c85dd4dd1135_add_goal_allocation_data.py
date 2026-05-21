"""add_goal_allocation_data

Revision ID: c85dd4dd1135
Revises: 0002
Create Date: 2026-05-21 13:15:24.258183

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'c85dd4dd1135'
down_revision: Union[str, None] = '0002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('goals', sa.Column('allocation_data', sa.String(), nullable=True))

    # Migrate existing ASSET_ALLOCATION goals: copy description → allocation_data,
    # then clear description (it was being used as data storage, not a human note).
    conn = op.get_bind()
    conn.execute(sa.text(
        "UPDATE goals SET allocation_data = description, description = NULL "
        "WHERE goal_type = 'ASSET_ALLOCATION' AND description IS NOT NULL"
    ))


def downgrade() -> None:
    # Restore description from allocation_data before dropping the column.
    conn = op.get_bind()
    conn.execute(sa.text(
        "UPDATE goals SET description = allocation_data "
        "WHERE goal_type = 'ASSET_ALLOCATION' AND allocation_data IS NOT NULL"
    ))
    op.drop_column('goals', 'allocation_data')
