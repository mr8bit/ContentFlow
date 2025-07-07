#!/usr/bin/env python3
"""Script to create AI models table manually"""

import sys
sys.path.append('.')

from sqlalchemy import create_engine, text
from config import settings
from models import Base, AIModel
from database import engine

def create_ai_models_table():
    """Create AI models table if it doesn't exist"""
    try:
        # Create the table using SQLAlchemy metadata
        AIModel.__table__.create(engine, checkfirst=True)
        print("✓ AI models table created successfully")
        
        # Check if table was created (PostgreSQL syntax)
        with engine.connect() as conn:
            result = conn.execute(text("SELECT tablename FROM pg_tables WHERE tablename='ai_models'"))
            if result.fetchone():
                print("✓ AI models table exists in database")
            else:
                print("✗ AI models table was not created")
                
    except Exception as e:
        print(f"Error creating AI models table: {e}")
        return False
    
    return True

if __name__ == "__main__":
    print("Creating AI models table...")
    success = create_ai_models_table()
    if success:
        print("Done!")
    else:
        print("Failed to create table")
        sys.exit(1)