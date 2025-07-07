import asyncio
import logging
import os
import aiofiles
from pathlib import Path
from typing import List, Optional, Dict, Any
from telegram import Bot, Update, Message
from telegram.error import TelegramError, Forbidden, BadRequest, TimedOut
from telegram.request import HTTPXRequest
from telegram.constants import ParseMode
from config import settings
from datetime import datetime
from database import get_db
from crud import get_setting
try:
    from telethon import TelegramClient
    from telethon.sessions import StringSession
    from telethon.errors import FloodWaitError, ChannelPrivateError, UsernameNotOccupiedError
    TELETHON_AVAILABLE = True
except ImportError:
    TELETHON_AVAILABLE = False
    TelegramClient = None
    StringSession = None
    FloodWaitError = ChannelPrivateError = UsernameNotOccupiedError = None

logger = logging.getLogger(__name__)


def escape_markdown_v2(text: str) -> str:
    """
    Escape special characters for Telegram MarkdownV2 format.
    
    Characters that need to be escaped in MarkdownV2:
    '_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!'
    """
    if not text:
        return text
    
    # Characters that need to be escaped in MarkdownV2
    special_chars = ['_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!']
    
    escaped_text = text
    for char in special_chars:
        escaped_text = escaped_text.replace(char, f'\\{char}')
    
    return escaped_text


class TelegramService:
    def __init__(self):
        self.bot = None
        if settings.telegram_bot_token:
            # Create custom request with increased timeouts
            request = HTTPXRequest(
                connection_pool_size=8,
                read_timeout=60.0,  # Увеличиваем таймаут чтения до 60 секунд
                write_timeout=60.0,  # Увеличиваем таймаут записи до 60 секунд
                connect_timeout=30.0,  # Таймаут подключения 30 секунд
                pool_timeout=10.0
            )
            self.bot = Bot(token=settings.telegram_bot_token, request=request)
            logger.info("Telegram Bot initialized with extended timeouts (read: 60s, write: 60s, connect: 30s)")
        else:
            logger.warning("Telegram Bot not initialized: TELEGRAM_BOT_TOKEN not provided")
        self.client = None
        self._initialize_client()
    
    def _initialize_client(self):
        """Initialize Telegram Client if credentials are available."""
        if not TELETHON_AVAILABLE:
            logger.warning("Telegram Client not available. Install telethon to read channel messages.")
            return
            
        # Get Telegram settings from database
        session_string = None
        api_id = None
        api_hash = None
        
        try:
            db = next(get_db())
            try:
                # Get session string
                session_setting = get_setting(db, "telegram_session_string")
                if session_setting and session_setting.value:
                    session_string = session_setting.value
                    logger.info("Session string loaded from database for Telegram Client")
                else:
                    # Fallback to environment variables
                    session_string = settings.telegram_session_string
                    if session_string:
                        logger.info("Session string loaded from environment variables for Telegram Client")
                
                # Get API ID
                api_id_setting = get_setting(db, "telegram_api_id")
                if api_id_setting and api_id_setting.value:
                    try:
                        api_id = int(api_id_setting.value)
                        logger.info("API ID loaded from database for Telegram Client")
                    except ValueError:
                        logger.error("Invalid API ID format in database")
                else:
                    # Fallback to environment variables
                    api_id = settings.telegram_api_id
                    if api_id:
                        logger.info("API ID loaded from environment variables for Telegram Client")
                
                # Get API Hash
                api_hash_setting = get_setting(db, "telegram_api_hash")
                if api_hash_setting and api_hash_setting.value:
                    api_hash = api_hash_setting.value
                    logger.info("API Hash loaded from database for Telegram Client")
                else:
                    # Fallback to environment variables
                    api_hash = settings.telegram_api_hash
                    if api_hash:
                        logger.info("API Hash loaded from environment variables for Telegram Client")
                        
            finally:
                db.close()
        except Exception as e:
            logger.error(f"Error loading Telegram settings from database: {e}")
            # Fallback to environment variables
            session_string = settings.telegram_session_string
            api_id = settings.telegram_api_id
            api_hash = settings.telegram_api_hash
        
        # Check if we have required credentials
        if not api_id or not api_hash:
            logger.warning("Telegram Client not available. Set TELEGRAM_API_ID/TELEGRAM_API_HASH in database or environment variables to read channel messages.")
            return
            
        # Use session_string if available to avoid interactive authorization
        if session_string:
            session = StringSession(session_string)
            self.client = TelegramClient(session, api_id, api_hash)
            logger.info("Telegram Client initialized with session string")
        else:
            self.client = TelegramClient("auto_poster_client", api_id, api_hash)
            logger.warning("Telegram Client initialized without session string - may require interactive authorization")
    
    async def _ensure_client_connected(self) -> bool:
        """Ensure the client is connected, start it if necessary."""
        if not self.client:
            return False
        
        try:
            # Check if client is already connected
            if self.client.is_connected():
                return True
            
            # Try to start the client if not connected
            logger.info("Starting Telegram client...")
            await self.client.start()
            logger.info("Telegram client started successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to start Telegram client: {e}")
            return False
    
    def _is_client_connected(self) -> bool:
        """Check if the Telegram client is connected."""
        if not self.client:
            return False
        
        try:
            return self.client.is_connected()
        except Exception as e:
            logger.error(f"Error checking client connection: {e}")
            return False
    
    async def _download_media(self, message, media_type: str) -> Optional[str]:
        """Download media file from Telegram message and return local file path."""
        try:
            # Create media directory if it doesn't exist
            media_dir = Path("media")
            media_dir.mkdir(exist_ok=True)
            
            # Generate filename based on message ID and media type
            file_extension = ""
            if media_type == "photo":
                file_extension = ".jpg"
            elif media_type == "video":
                file_extension = ".mp4"
            elif media_type == "document":
                # Try to get original filename or use generic extension
                if hasattr(message.document, 'attributes'):
                    for attr in message.document.attributes:
                        if hasattr(attr, 'file_name') and attr.file_name:
                            file_extension = Path(attr.file_name).suffix or ".bin"
                            break
                if not file_extension:
                    file_extension = ".bin"
            elif media_type == "animation":
                file_extension = ".gif"
            
            filename = f"{message.id}_{media_type}{file_extension}"
            file_path = media_dir / filename
            
            # Download the file
            logger.info(f"Downloading {media_type} from message {message.id} to {file_path}")
            await message.download_media(file=str(file_path))
            
            # Return relative path for storage in database
            return str(file_path)
            
        except Exception as e:
            logger.error(f"Error downloading media from message {message.id}: {e}")
            return None
    
    async def get_channel_info(self, channel_id: str) -> Optional[Dict[str, Any]]:
        """Get information about a Telegram channel."""
        if not self.bot:
            logger.warning(f"Cannot get channel info for {channel_id}: Telegram Bot not configured")
            return None
            
        try:
            chat = await self.bot.get_chat(channel_id)
            return {
                "id": str(chat.id),
                "title": chat.title,
                "username": chat.username,
                "type": chat.type,
                "member_count": getattr(chat, 'member_count', None)
            }
        except Exception as e:
            logger.error(f"Error getting channel info for {channel_id}: {str(e)}")
            return None
    
    async def get_latest_messages(self, channel_id: str, limit: int = 10, offset_id: int = 0) -> List[Dict[str, Any]]:
        """Get latest messages from a channel."""
        if not self.client:
            logger.warning(f"Cannot read messages from {channel_id}: Telegram Client not configured")
            return []
            
        try:
            # Ensure the client is connected
            if not await self._ensure_client_connected():
                logger.warning(f"Cannot read messages from {channel_id}: Failed to connect Telegram Client")
                return []
            
            raw_messages = []
            media_groups = {}  # grouped_id -> list of messages
            
            # Get messages from the channel using Telethon API
            # Note: offset_id in Telethon means "get messages older than this ID"
            # So we need to get recent messages and filter for newer ones
            kwargs = {
                'entity': channel_id,
                'limit': limit if not offset_id or offset_id == 0 else limit * 2  # Get more messages to filter
            }
            # Don't use offset_id directly, we'll filter manually
                
            async for message in self.client.iter_messages(**kwargs):
                # Skip messages that are not newer than offset_id
                if offset_id and offset_id > 0 and message.id <= offset_id:
                    continue
                    
                # Check if message is part of a media group
                grouped_id = getattr(message, 'grouped_id', None)
                
                # Convert Telethon message to our format
                message_data = {
                    'message_id': message.id,
                    'date': message.date,
                    'text': message.text or '',
                    'media': None,
                    'grouped_id': grouped_id
                }
                
                # Handle media
                if message.photo:
                    file_path = await self._download_media(message, 'photo')
                    message_data['media'] = {
                        'type': 'photo',
                        'file_id': str(message.photo.id),
                        'file_path': file_path
                    }
                elif message.video:
                    file_path = await self._download_media(message, 'video')
                    message_data['media'] = {
                        'type': 'video',
                        'file_id': str(message.video.id),
                        'file_path': file_path
                    }
                elif message.document:
                    file_path = await self._download_media(message, 'document')
                    message_data['media'] = {
                        'type': 'document',
                        'file_id': str(message.document.id),
                        'file_path': file_path
                    }
                elif message.gif:
                    file_path = await self._download_media(message, 'animation')
                    message_data['media'] = {
                        'type': 'animation',
                        'file_id': str(message.gif.id),
                        'file_path': file_path
                    }
                
                # Group messages by grouped_id if they have media
                if grouped_id and message_data['media']:
                    if grouped_id not in media_groups:
                        media_groups[grouped_id] = []
                    media_groups[grouped_id].append(message_data)
                else:
                    raw_messages.append(message_data)
            
            # Process media groups - combine them into single messages
            messages = []
            for group_messages in media_groups.values():
                if len(group_messages) > 1:
                    # Combine multiple media into one message
                    main_message = group_messages[0]  # Use first message as base
                    media_list = []
                    
                    # Collect all media from the group
                    for msg in group_messages:
                        if msg['media']:
                            media_list.append(msg['media'])
                    
                    # Update main message with media group
                    main_message['media'] = {
                        'type': 'media_group',
                        'media_list': media_list
                    }
                    
                    # Use text from the first message that has text
                    for msg in group_messages:
                        if msg['text'].strip():
                            main_message['text'] = msg['text']
                            break
                    
                    messages.append(main_message)
                else:
                    # Single media message
                    messages.extend(group_messages)
            
            # Add non-grouped messages
            messages.extend(raw_messages)
            
            # Sort messages by message_id to maintain order
            messages.sort(key=lambda x: x['message_id'], reverse=True)
            
            logger.info(f"Retrieved {len(messages)} messages from {channel_id} (grouped {len(media_groups)} media groups)")
            return messages
            
        except FloodWaitError as e:
            logger.warning(f"Rate limited when reading {channel_id}, waiting {e.seconds} seconds")
            await asyncio.sleep(e.seconds)
            return []
        except ChannelPrivateError:
            logger.error(f"Channel {channel_id} is private or bot doesn't have access")
            return []
        except UsernameNotOccupiedError:
            logger.error(f"Channel {channel_id} not found")
            return []
        except Exception as e:
            error_msg = str(e)
            logger.error(f"Error getting messages from {channel_id}: {error_msg}")
            
            # Handle low-level Telethon errors that might require client restart
            if "unpack requires a buffer" in error_msg or "struct.error" in error_msg:
                logger.warning(f"Low-level Telethon error detected, attempting to restart client")
                try:
                    if self._is_client_connected():
                        await self.client.disconnect()
                    await asyncio.sleep(2)  # Small delay before restart
                    await self.client.start()
                    logger.info("Client restarted successfully")
                except Exception as restart_error:
                    logger.error(f"Failed to restart client: {restart_error}")
            
            return []
    
    async def close(self):
        """Close the Telegram Client connection."""
        if self._is_client_connected():
            await self.client.disconnect()
            logger.info("Telegram Client connection closed")
    
    async def send_message(self, channel_id: str, text: str, parse_mode: str = ParseMode.MARKDOWN_V2) -> Optional[int]:
        """Send a message to a channel."""
        if not self.bot:
            logger.warning(f"Cannot send message to {channel_id}: Telegram Bot not configured")
            return None
            
        try:
            # Escape text for MarkdownV2 if needed
            escaped_text = text
            if parse_mode == ParseMode.MARKDOWN_V2:
                escaped_text = escape_markdown_v2(text)
            
            message = await self.bot.send_message(
                chat_id=channel_id,
                text=escaped_text,
                parse_mode=parse_mode
            )
            logger.info(f"Message sent to {channel_id}, message_id: {message.message_id}")
            return message.message_id
        except Forbidden:
            logger.error(f"Bot is not allowed to send messages to {channel_id}")
            return None
        except BadRequest as e:
            logger.error(f"Bad request when sending message to {channel_id}: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"Error sending message to {channel_id}: {str(e)}")
            return None
    
    async def send_photo(self, channel_id: str, photo_url: str, caption: str = "", parse_mode: str = ParseMode.MARKDOWN_V2) -> Optional[int]:
        """Send a photo to a channel."""
        if not self.bot:
            logger.warning(f"Cannot send photo to {channel_id}: Telegram Bot not configured")
            return None
            
        try:
            import os
            
            # Escape caption for MarkdownV2 if needed
            escaped_caption = caption
            if caption and parse_mode == ParseMode.MARKDOWN_V2:
                escaped_caption = escape_markdown_v2(caption)
            
            # Telegram caption limit is 1024 characters
            if len(escaped_caption) > 1024:
                escaped_caption = escaped_caption[:1021] + "..."
            
            # Telegram caption limit is 1024 characters
            if len(escaped_caption) > 1024:
                escaped_caption = escaped_caption[:1021] + "..."
            
            # Telegram caption limit is 1024 characters
            if len(escaped_caption) > 1024:
                escaped_caption = escaped_caption[:1021] + "..."
            
            # Check if it's a local file path
            if os.path.isfile(photo_url):
                with open(photo_url, 'rb') as photo_file:
                    message = await self.bot.send_photo(
                        chat_id=channel_id,
                        photo=photo_file,
                        caption=escaped_caption,
                        parse_mode=parse_mode
                    )
            else:
                # Handle URL or file_id
                message = await self.bot.send_photo(
                    chat_id=channel_id,
                    photo=photo_url,
                    caption=escaped_caption,
                    parse_mode=parse_mode
                )
            
            logger.info(f"Photo sent to {channel_id}, message_id: {message.message_id}")
            return message.message_id
        except Exception as e:
            logger.error(f"Error sending photo to {channel_id}: {str(e)}")
            return None
    
    async def send_video(self, channel_id: str, video_url: str, caption: str = "", parse_mode: str = ParseMode.MARKDOWN_V2) -> Optional[int]:
        """Send a video to a channel."""
        if not self.bot:
            logger.warning(f"Cannot send video to {channel_id}: Telegram Bot not configured")
            return None
            
        try:
            import os
            
            # Escape caption for MarkdownV2 if needed
            escaped_caption = caption
            if caption and parse_mode == ParseMode.MARKDOWN_V2:
                escaped_caption = escape_markdown_v2(caption)
            
            # Check if it's a local file path
            if os.path.isfile(video_url):
                with open(video_url, 'rb') as video_file:
                    message = await self.bot.send_video(
                        chat_id=channel_id,
                        video=video_file,
                        caption=escaped_caption,
                        parse_mode=parse_mode
                    )
            else:
                # Handle URL or file_id
                message = await self.bot.send_video(
                    chat_id=channel_id,
                    video=video_url,
                    caption=escaped_caption,
                    parse_mode=parse_mode
                )
            
            logger.info(f"Video sent to {channel_id}, message_id: {message.message_id}")
            return message.message_id
        except Exception as e:
            logger.error(f"Error sending video to {channel_id}: {str(e)}")
            return None
    
    async def send_document(self, channel_id: str, document_url: str, caption: str = "", parse_mode: str = ParseMode.MARKDOWN_V2) -> Optional[int]:
        """Send a document to a channel."""
        if not self.bot:
            logger.warning(f"Cannot send document to {channel_id}: Telegram Bot not configured")
            return None
            
        try:
            import os
            
            # Escape caption for MarkdownV2 if needed
            escaped_caption = caption
            if caption and parse_mode == ParseMode.MARKDOWN_V2:
                escaped_caption = escape_markdown_v2(caption)
            
            # Check if it's a local file path
            if os.path.isfile(document_url):
                with open(document_url, 'rb') as document_file:
                    message = await self.bot.send_document(
                        chat_id=channel_id,
                        document=document_file,
                        caption=escaped_caption,
                        parse_mode=parse_mode
                    )
            else:
                # Handle URL or file_id
                message = await self.bot.send_document(
                    chat_id=channel_id,
                    document=document_url,
                    caption=escaped_caption,
                    parse_mode=parse_mode
                )
            
            logger.info(f"Document sent to {channel_id}, message_id: {message.message_id}")
            return message.message_id
        except Exception as e:
            logger.error(f"Error sending document to {channel_id}: {str(e)}")
            return None
    
    async def send_media_group(self, channel_id: str, media_list: List[Dict[str, Any]]) -> Optional[List[int]]:
        """Send a media group (album) to a channel."""
        if not self.bot:
            logger.warning(f"Cannot send media group to {channel_id}: Telegram Bot not configured")
            return None
            
        try:
            from telegram import InputMediaPhoto, InputMediaVideo
            import os
            
            # For media groups, we'll skip caption to avoid "too long" errors
            # Media groups have very strict caption limits
            escaped_caption = ""
            
            media_group = []
            opened_files = []  # Keep track of opened files
            
            try:
                for i, media in enumerate(media_list):
                    media_path = media["url"]
                    
                    # Check if it's a local file path
                    if os.path.isfile(media_path):
                        # Open local file and keep it open
                        file_obj = open(media_path, 'rb')
                        opened_files.append(file_obj)
                        
                        if media["type"] == "photo":
                            input_media = InputMediaPhoto(
                                media=file_obj
                            )
                        elif media["type"] == "video":
                            input_media = InputMediaVideo(
                                media=file_obj
                            )
                        else:
                            file_obj.close()
                            opened_files.pop()
                            continue
                    else:
                        # Handle URL or file_id
                        if media["type"] == "photo":
                            input_media = InputMediaPhoto(
                                media=media_path
                            )
                        elif media["type"] == "video":
                            input_media = InputMediaVideo(
                                media=media_path
                            )
                        else:
                            continue
                    
                    media_group.append(input_media)
            
                if not media_group:
                    return None
                
                # Debug logging
                logger.info(f"Sending media group with {len(media_group)} items")
                for i, media_item in enumerate(media_group):
                    logger.info(f"Media item {i}: type={type(media_item).__name__}, has_caption={hasattr(media_item, 'caption') and media_item.caption is not None}")
                    if hasattr(media_item, 'caption') and media_item.caption:
                        logger.info(f"Media item {i} caption length: {len(media_item.caption)}")
                
                messages = await self.bot.send_media_group(
                    chat_id=channel_id,
                    media=media_group
                )
                
                message_ids = [msg.message_id for msg in messages]
                logger.info(f"Media group sent to {channel_id}, message_ids: {message_ids}")
                return message_ids
                
            finally:
                # Close all opened files
                for file_obj in opened_files:
                    try:
                        file_obj.close()
                    except:
                        pass
                        
        except Exception as e:
            logger.error(f"Error sending media group to {channel_id}: {str(e)}")
            return None
    
    async def test_bot_token(self) -> bool:
        """Test if the bot token is valid."""
        if not self.bot:
            logger.warning("Cannot test bot token: Telegram Bot not configured")
            return False
            
        try:
            bot_info = await self.bot.get_me()
            logger.info(f"Bot token is valid. Bot username: @{bot_info.username}")
            return True
        except Exception as e:
            logger.error(f"Bot token test failed: {str(e)}")
            return False
    
    async def check_channel_access(self, channel_id: str) -> Dict[str, Any]:
        """Check bot's access level to a channel."""
        if not self.bot:
            return {
                "channel_exists": False,
                "can_read": False,
                "can_post": False,
                "error": "Telegram Bot not configured"
            }
            
        try:
            chat = await self.bot.get_chat(channel_id)
            
            # Try to get bot's member status
            try:
                bot_member = await self.bot.get_chat_member(channel_id, self.bot.id)
                can_post = bot_member.status in ['administrator', 'creator']
                can_read = True  # If we can get chat info, we can read
            except:
                can_post = False
                can_read = False
            
            return {
                "channel_exists": True,
                "can_read": can_read,
                "can_post": can_post,
                "channel_info": {
                    "title": chat.title,
                    "username": chat.username,
                    "type": chat.type
                }
            }
        except Forbidden:
            return {
                "channel_exists": True,
                "can_read": False,
                "can_post": False,
                "error": "Bot is not a member of this channel"
            }
        except BadRequest:
            return {
                "channel_exists": False,
                "can_read": False,
                "can_post": False,
                "error": "Channel not found or invalid channel ID"
            }
        except Exception as e:
            return {
                "channel_exists": False,
                "can_read": False,
                "can_post": False,
                "error": str(e)
            }


# Global instance
telegram_service = TelegramService()