#!/usr/bin/env python3
import sys
import os
sys.path.append('/app')

from database import SessionLocal
from models import Settings
from config import settings

def check_and_fix_settings():
    db = SessionLocal()
    try:
        # Check if openrouter_api_key exists in database
        openrouter_setting = db.query(Settings).filter(Settings.key == 'openrouter_api_key').first()
        
        if openrouter_setting:
            print(f"OpenRouter API key found in database: {openrouter_setting.value[:20]}...")
        else:
            print("OpenRouter API key NOT found in database")
            
            # Get from environment variable
            env_key = os.getenv('OPENROUTER_API_KEY')
            if env_key:
                print(f"Found OpenRouter API key in environment: {env_key[:20]}...")
                
                # Add to database
                new_setting = Settings(
                    key='openrouter_api_key',
                    value=env_key,
                    description='OpenRouter API key for LLM classification'
                )
                db.add(new_setting)
                db.commit()
                print("Added OpenRouter API key to database")
            else:
                print("OpenRouter API key not found in environment variables")
        
        # Check all settings
        all_settings = db.query(Settings).all()
        print(f"\nAll settings in database ({len(all_settings)}):")
        for setting in all_settings:
            value_preview = setting.value[:50] + '...' if len(setting.value) > 50 else setting.value
            print(f"  {setting.key}: {value_preview}")
            
    finally:
        db.close()

if __name__ == '__main__':
    check_and_fix_settings()