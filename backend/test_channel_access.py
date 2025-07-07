import asyncio
from telegram_scraper_service import TelegramChannelScraper
from telethon import TelegramClient
from telethon.sessions import StringSession
from config import settings
from database import get_db
from crud import get_setting

async def test_session_type():
    try:
        print("Testing session type...")
        
        # Get session_string from database
        session_string = None
        db = next(get_db())
        try:
            session_setting = get_setting(db, "telegram_session_string")
            if session_setting and session_setting.value:
                session_string = session_setting.value
                print("Session string loaded from database")
            else:
                # Fallback to environment variables
                session_string = settings.telegram_session_string
                if session_string:
                    print("Session string loaded from environment variables")
                else:
                    print("❌ No session string found in database or environment variables")
                    return
        finally:
            db.close()
        
        # Create client with current session
        client = TelegramClient(
            StringSession(session_string),
            settings.telegram_api_id,
            settings.telegram_api_hash
        )
        
        await client.connect()
        
        if await client.is_user_authorized():
            me = await client.get_me()
            print(f"Session info: {me}")
            
            if me.bot:
                print("❌ Current session is a BOT session")
                print("❌ Bot sessions cannot read messages from public channels without admin rights")
                print("✅ Solution: You need a USER session string")
                print("\nTo get a user session:")
                print("1. Run a script with your phone number and verification code")
                print("2. Or use an existing user account session")
            else:
                print("✅ Current session is a USER session")
                print("✅ This should work for reading public channels")
        else:
            print("❌ Session is not authorized")
            
        await client.disconnect()
        
    except Exception as e:
        print(f"❌ Error checking session: {e}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    asyncio.run(test_session_type())