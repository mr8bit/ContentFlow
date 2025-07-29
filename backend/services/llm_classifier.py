from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from models import TargetChannel, Post, PostStatus
from schemas import TargetChannel as TargetChannelSchema
import httpx
import json
import logging

logger = logging.getLogger(__name__)

class LLMClassifier:
    """Service for classifying posts using LLM models"""
    
    def __init__(self, api_key: str, model: str = "anthropic/claude-3-haiku"):
        self.api_key = api_key
        self.model = model
        self.base_url = "https://openrouter.ai/api/v1"
    
    async def classify_post(self, db: Session, post: Post) -> Optional[Dict[str, Any]]:
        """Classify a post and determine the best target channel
        
        Returns:
            Dict with 'target_channel_id', 'confidence', and 'reasoning'
            or None if no suitable channel found
        """
        try:
            # Get all target channels with their descriptions and tags
            target_channels = db.query(TargetChannel).all()
            
            if not target_channels:
                logger.warning("No target channels found for classification")
                return None
            
            # Prepare channel descriptions for LLM
            channels_info = []
            for channel in target_channels:
                channel_info = {
                    "id": channel.id,
                    "name": channel.channel_name,
                    "description": channel.description or "",
                    "tags": channel.tags or []
                }
                channels_info.append(channel_info)
            
            # Create prompt for LLM
            post_text = post.original_text or post.processed_text or ""
            prompt = self._create_classification_prompt(post_text, channels_info)
            
            # Call OpenAI API
            response = await self._call_openai_api(prompt)
            
            if response:
                # Update post with classification data
                post.llm_classification_confidence = response.get('confidence')
                post.llm_classification_result = json.dumps(response)
                db.commit()
                
                return response
            
            return None
            
        except Exception as e:
            logger.error(f"Error classifying post {post.id}: {str(e)}")
            return None
    
    def _create_classification_prompt(self, post_text: str, channels_info: List[Dict]) -> str:
        """Create a prompt for LLM classification"""
        channels_desc = "\n".join([
            f"Channel {ch['id']}: {ch['name']}\n"
            f"Description: {ch['description']}\n"
            f"Tags: {', '.join(ch['tags'])}\n"
            for ch in channels_info
        ])
        
        prompt = f"""
You are a content classifier. Analyze the following post and determine which target channel it best fits.

Post text:
{post_text}

Available channels:
{channels_desc}

Please respond with a JSON object containing:
- "target_channel_id": the ID of the best matching channel (or null if no good match)
- "confidence": confidence percentage (50-100)
- "reasoning": brief explanation of your choice

If the post doesn't fit any channel well, set target_channel_id to null and confidence to 0.

Response format:
{{
  "target_channel_id": 1,
  "confidence": 85,
  "reasoning": "This post matches channel 1 because..."
}}
"""
        return prompt
    
    async def _call_openai_api(self, prompt: str) -> Optional[Dict[str, Any]]:
        """Call OpenRouter API for classification"""
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": self.model,
                        "messages": [
                            {"role": "system", "content": "You are a helpful content classifier. Always respond with valid JSON."},
                            {"role": "user", "content": prompt}
                        ],
                        "temperature": 0.3,
                        "max_tokens": 500
                    }
                )
                
                if response.status_code != 200:
                    logger.error(f"OpenRouter API error: {response.status_code} - {response.text}")
                    return None
                
                response_data = response.json()
                content = response_data["choices"][0]["message"]["content"].strip()
                
                # Parse JSON response
                try:
                    result = json.loads(content)
                    return result
                except json.JSONDecodeError:
                    logger.error(f"Failed to parse LLM response as JSON: {content}")
                    return None
                    
        except Exception as e:
            logger.error(f"OpenRouter API error: {str(e)}")
            return None
    
    async def process_post_classification(self, db: Session, post: Post) -> bool:
        """Process post classification and update status based on rules
        
        Returns:
            True if post was processed successfully, False otherwise
        """
        try:
            # Classify the post
            classification_result = await self.classify_post(db, post)
            
            if not classification_result or not classification_result.get('target_channel_id'):
                # No suitable channel found, mark as waiting for manual review
                post.status = PostStatus.WAITING
                db.commit()
                logger.info(f"Post {post.id} marked as WAITING - no suitable channel found")
                return True
            
            target_channel_id = classification_result['target_channel_id']
            confidence = classification_result['confidence']
            
            # Get target channel
            target_channel = db.query(TargetChannel).filter(
                TargetChannel.id == target_channel_id
            ).first()
            
            if not target_channel:
                logger.error(f"Target channel {target_channel_id} not found")
                post.status = PostStatus.WAITING
                db.commit()
                return False
            
            # Update post with target channel
            post.target_channel_id = target_channel_id
            
            # Apply classification rules
            if confidence >= target_channel.classification_threshold:
                if target_channel.auto_publish_enabled:
                    # Auto-publish: rewrite and publish
                    post.status = PostStatus.PENDING  # Will be published by publisher worker
                    logger.info(f"Post {post.id} marked for auto-publishing to channel {target_channel_id}")
                else:
                    # Manual approval required: rewrite but don't publish
                    post.status = PostStatus.PROCESSED
                    logger.info(f"Post {post.id} processed but requires manual approval")
            else:
                # Confidence too low, wait for manual review
                post.status = PostStatus.WAITING
                logger.info(f"Post {post.id} marked as WAITING - confidence {confidence}% below threshold {target_channel.classification_threshold}%")
            
            db.commit()
            return True
            
        except Exception as e:
            logger.error(f"Error processing post classification {post.id}: {str(e)}")
            return False