from pydantic_settings import BaseSettings
from typing import Optional
from pydantic import field_validator


class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql://autoposter:autoposter123@postgres:5432/autoposter"
    
    # Redis
    redis_url: str = "redis://redis:6379"
    
    # Telegram
    telegram_bot_token: Optional[str] = None
    telegram_api_id: Optional[int] = None
    telegram_api_hash: Optional[str] = None
    telegram_session_string: Optional[str] = None
    
    @field_validator('telegram_api_id', mode='before')
    @classmethod
    def validate_telegram_api_id(cls, v):
        if v is None or v == '' or v == 'your_api_id_here':
            return None
        if isinstance(v, str):
            try:
                return int(v)
            except ValueError:
                return None
        return v
    
    @field_validator('telegram_api_hash', mode='before')
    @classmethod
    def validate_telegram_api_hash(cls, v):
        if v is None or v == '' or v == 'your_api_hash_here':
            return None
        return v
    
    @field_validator('telegram_session_string', mode='before')
    @classmethod
    def validate_telegram_session_string(cls, v):
        if v is None or v == '' or v == 'your_session_string_here':
            return None
        return v
    
    # OpenRouter
    openrouter_api_key: Optional[str] = None
    openrouter_model: str = "anthropic/claude-3-haiku"
    
    @field_validator('telegram_bot_token', mode='before')
    @classmethod
    def validate_telegram_bot_token(cls, v):
        if v is None or v == '' or v == 'your_telegram_bot_token_here':
            return None
        return v
    
    @field_validator('openrouter_api_key', mode='before')
    @classmethod
    def validate_openrouter_api_key(cls, v):
        if v is None or v == '' or v == 'your_openrouter_api_key_here':
            return None
        return v
    
    # JWT
    jwt_secret: str = "your-secret-key-change-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24 * 7  # 7 days
    
    # Admin
    admin_username: str = "admin"
    admin_password: str = "admin123"
    
    # Monitoring
    default_check_interval: int = 5  # seconds
    max_check_interval: int = 3600  # 1 hour
    min_check_interval: int = 1  # 1 second
    
    # Frontend
    react_app_api_url: Optional[str] = None
    
    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()