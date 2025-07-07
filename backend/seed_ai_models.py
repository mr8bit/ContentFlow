#!/usr/bin/env python3
"""Script to seed AI models with default data"""

import sys
sys.path.append('.')

from sqlalchemy.orm import Session
from database import SessionLocal
from models import AIModel
from datetime import datetime, timezone

def seed_ai_models():
    """Add default AI models to the database"""
    db = SessionLocal()
    try:
        # Check if models already exist
        existing_count = db.query(AIModel).count()
        if existing_count > 0:
            print(f"AI models already exist ({existing_count} models). Skipping seeding.")
            return True
        
        # Default AI models
        default_models = [
            {
                "name": "GPT-4o",
                "model_id": "openai/gpt-4o",
                "description": "Самая продвинутая модель OpenAI с отличным пониманием контекста",
                "is_active": True,
                "is_default": True
            },
            {
                "name": "GPT-4o Mini",
                "model_id": "openai/gpt-4o-mini",
                "description": "Быстрая и экономичная версия GPT-4o",
                "is_active": True,
                "is_default": False
            },
            {
                "name": "Claude 3.5 Sonnet",
                "model_id": "anthropic/claude-3.5-sonnet",
                "description": "Мощная модель Anthropic с отличными способностями к анализу и творчеству",
                "is_active": True,
                "is_default": False
            },
            {
                "name": "Claude 3 Haiku",
                "model_id": "anthropic/claude-3-haiku",
                "description": "Быстрая и эффективная модель Claude для простых задач",
                "is_active": True,
                "is_default": False
            },
            {
                "name": "Gemini Pro 1.5",
                "model_id": "google/gemini-pro-1.5",
                "description": "Продвинутая модель Google с большим контекстным окном",
                "is_active": True,
                "is_default": False
            },
            {
                "name": "Llama 3.1 70B",
                "model_id": "meta-llama/llama-3.1-70b-instruct",
                "description": "Мощная открытая модель Meta с 70 миллиардами параметров",
                "is_active": True,
                "is_default": False
            }
        ]
        
        created_count = 0
        for model_data in default_models:
            # Check if model already exists
            existing = db.query(AIModel).filter(AIModel.model_id == model_data["model_id"]).first()
            if not existing:
                ai_model = AIModel(
                    name=model_data["name"],
                    model_id=model_data["model_id"],
                    description=model_data["description"],
                    is_active=model_data["is_active"],
                    is_default=model_data["is_default"],
                    created_at=datetime.now(timezone.utc)
                )
                db.add(ai_model)
                created_count += 1
                print(f"✓ Added model: {model_data['name']}")
            else:
                print(f"- Model already exists: {model_data['name']}")
        
        db.commit()
        print(f"\n✓ Successfully seeded {created_count} AI models")
        
        # Show all models
        all_models = db.query(AIModel).all()
        print(f"\nTotal AI models in database: {len(all_models)}")
        for model in all_models:
            status = "[DEFAULT]" if model.is_default else "[ACTIVE]" if model.is_active else "[INACTIVE]"
            print(f"  {status} {model.name} ({model.model_id})")
        
        return True
        
    except Exception as e:
        print(f"Error seeding AI models: {e}")
        db.rollback()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    print("Seeding AI models...")
    success = seed_ai_models()
    if success:
        print("\nDone!")
    else:
        print("\nFailed to seed AI models")
        sys.exit(1)