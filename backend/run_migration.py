#!/usr/bin/env python3

import sys
import os
from alembic.config import Config
from alembic import command

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def run_migration():
    # Create Alembic configuration
    alembic_cfg = Config("alembic.ini")
    
    try:
        # Run the migration
        command.upgrade(alembic_cfg, "head")
        print("Migration completed successfully!")
    except Exception as e:
        print(f"Migration failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    run_migration()