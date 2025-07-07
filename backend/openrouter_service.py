import httpx
import asyncio
from typing import Optional
from config import settings
import logging
from sqlalchemy.orm import Session
from database import get_db
import crud

logger = logging.getLogger(__name__)


class OpenRouterService:
    def __init__(self):
        self.api_key = settings.openrouter_api_key
        self.model = settings.openrouter_model
        self.base_url = "https://openrouter.ai/api/v1"
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://auto-poster-bot.local",
            "X-Title": "Auto Poster Bot"
        }
    
    async def rewrite_text(self, original_text: str, context: Optional[str] = None) -> Optional[str]:
        """Rewrite text using OpenRouter API."""
        if not original_text or not original_text.strip():
            return None
        
        try:
            prompt = self._create_rewrite_prompt(original_text, context)
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers=self.headers,
                    json={
                        "model": self.model,
                        "messages": [
                            {
                                "role": "system",
                                "content": "Ты профессиональный редактор контента. Твоя задача - переписать текст, сохранив основную идею, но изменив формулировку, стиль и структуру. Текст должен быть уникальным, но передавать ту же информацию."
                            },
                            {
                                "role": "user",
                                "content": prompt
                            }
                        ],
                        "max_tokens": 1000,
                        "temperature": 0.7,
                        "top_p": 0.9
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if "choices" in data and len(data["choices"]) > 0:
                        rewritten_text = data["choices"][0]["message"]["content"].strip()
                        logger.info(f"Successfully rewrote text: {len(original_text)} -> {len(rewritten_text)} chars")
                        return rewritten_text
                    else:
                        logger.error(f"No choices in OpenRouter response: {data}")
                        return None
                else:
                    logger.error(f"OpenRouter API error: {response.status_code} - {response.text}")
                    return None
                    
        except httpx.TimeoutException:
            logger.error("OpenRouter API timeout")
            return None
        except Exception as e:
            logger.error(f"Error rewriting text with OpenRouter: {str(e)}")
            return None
    
    def _create_rewrite_prompt(self, original_text: str, context: Optional[str] = None) -> str:
        """Create a prompt for text rewriting using database setting."""
        try:
            db = next(get_db())
            setting = crud.get_setting(db, "rewrite_prompt")
            db.close()
            
            if setting and setting.value:
                prompt_template = setting.value
            else:
                # Fallback to default prompt if setting not found
                prompt_template = """Перепиши следующий текст, сохранив основную идею и информацию, но изменив формулировку:

Оригинальный текст:
{original_text}

Требования:
1. Сохрани все важные факты и цифры
2. Измени структуру предложений
3. Используй синонимы и альтернативные формулировки
4. Сохрани тон и стиль, подходящий для Telegram-канала
5. Если есть ссылки или упоминания, сохрани их
6. Текст должен быть естественным и читаемым

Переписанный текст:"""
            
            # Replace placeholder with actual text
            prompt = prompt_template.format(original_text=original_text)
            
            if context:
                prompt += f"\nДополнительный контекст: {context}"
            
            return prompt
            
        except Exception as e:
            logger.error(f"Error getting rewrite prompt from database: {str(e)}")
            # Fallback to hardcoded prompt
            prompt = f"""Перепиши следующий текст, сохранив основную идею и информацию, но изменив формулировку:

Оригинальный текст:
{original_text}

Требования:
1. Сохрани все важные факты и цифры
2. Измени структуру предложений
3. Используй синонимы и альтернативные формулировки
4. Сохрани тон и стиль, подходящий для Telegram-канала
5. Если есть ссылки или упоминания, сохрани их
6. Текст должен быть естественным и читаемым

Переписанный текст:"""
            
            if context:
                prompt += f"\nДополнительный контекст: {context}"
            
            return prompt
    
    async def improve_text_with_prompt(self, original_text: str, user_prompt: str) -> Optional[str]:
        """Improve text using OpenRouter API with custom user prompt."""
        if not original_text or not original_text.strip() or not user_prompt or not user_prompt.strip():
            return None
        
        try:
            prompt = self._create_improve_prompt(original_text, user_prompt)
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers=self.headers,
                    json={
                        "model": self.model,
                        "messages": [
                            {
                                "role": "system",
                                "content": "Ты профессиональный редактор контента. Твоя задача - улучшить текст согласно указаниям пользователя, сохранив основную идею и важную информацию."
                            },
                            {
                                "role": "user",
                                "content": prompt
                            }
                        ],
                        "max_tokens": 1000,
                        "temperature": 0.7,
                        "top_p": 0.9
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if "choices" in data and len(data["choices"]) > 0:
                        improved_text = data["choices"][0]["message"]["content"].strip()
                        logger.info(f"Successfully improved text with custom prompt: {len(original_text)} -> {len(improved_text)} chars")
                        return improved_text
                    else:
                        logger.error(f"No choices in OpenRouter response: {data}")
                        return None
                else:
                    logger.error(f"OpenRouter API error: {response.status_code} - {response.text}")
                    return None
                    
        except httpx.TimeoutException:
            logger.error("OpenRouter API timeout")
            return None
        except Exception as e:
            logger.error(f"Error improving text with OpenRouter: {str(e)}")
            return None
    
    def _create_improve_prompt(self, original_text: str, user_prompt: str) -> str:
        """Create a prompt for text improvement with user instructions using database setting."""
        try:
            db = next(get_db())
            setting = crud.get_setting(db, "improve_prompt")
            db.close()
            
            if setting and setting.value:
                prompt_template = setting.value
            else:
                # Fallback to default prompt if setting not found
                prompt_template = """Улучши следующий текст согласно указаниям пользователя:

Оригинальный текст:
{original_text}

Инструкции пользователя:
{user_prompt}

Требования:
1. Следуй инструкциям пользователя
2. Сохрани все важные факты и цифры
3. Сохрани ссылки и упоминания, если они есть
4. Текст должен быть естественным и читаемым
5. Подходящий стиль для Telegram-канала

Улучшенный текст:"""
            
            # Replace placeholders with actual values
            prompt = prompt_template.format(original_text=original_text, user_prompt=user_prompt)
            
            return prompt
            
        except Exception as e:
            logger.error(f"Error getting improve prompt from database: {str(e)}")
            # Fallback to hardcoded prompt
            prompt = f"""Улучши следующий текст согласно указаниям пользователя:

Оригинальный текст:
{original_text}

Инструкции пользователя:
{user_prompt}

Требования:
1. Следуй инструкциям пользователя
2. Сохрани все важные факты и цифры
3. Сохрани ссылки и упоминания, если они есть
4. Текст должен быть естественным и читаемым
5. Подходящий стиль для Telegram-канала

Улучшенный текст:"""
            
            return prompt

    async def test_connection(self) -> bool:
        """Test connection to OpenRouter API."""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{self.base_url}/models",
                    headers=self.headers
                )
                return response.status_code == 200
        except Exception as e:
            logger.error(f"OpenRouter connection test failed: {str(e)}")
            return False


# Global instance
openrouter_service = OpenRouterService()