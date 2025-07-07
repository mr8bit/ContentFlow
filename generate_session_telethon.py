#!/usr/bin/env python3
"""
Telethon Session String Generator

This script helps you generate a session string for Telethon that can be used
to authenticate your Telegram account without interactive phone number verification.

Usage:
1. Make sure you have your API credentials from https://my.telegram.org/apps
2. Run this script: python generate_session_telethon.py
3. Enter your API ID, API Hash, and phone number when prompted
4. Enter the verification code sent to your Telegram app
5. Copy the generated session string to your .env file

Security Warning:
- Keep your session string secure and never share it
- The session string provides full access to your Telegram account
- Regenerate if compromised
"""

import asyncio
import os
from telethon import TelegramClient
from telethon.sessions import StringSession


async def generate_session():
    print("=== Telethon Session String Generator ===")
    print()
    print("This script will help you generate a session string for Telethon.")
    print("You'll need your API credentials from https://my.telegram.org/apps")
    print()
    
    # Get API credentials
    api_id = input("Enter your API ID: ").strip()
    api_hash = input("Enter your API Hash: ").strip()
    
    if not api_id or not api_hash:
        print("Error: API ID and API Hash are required!")
        return
    
    try:
        api_id = int(api_id)
    except ValueError:
        print("Error: API ID must be a number!")
        return
    
    print()
    print("Starting Telethon client...")
    
    # Create client with StringSession
    client = TelegramClient(StringSession(), api_id, api_hash)
    
    try:
        # Connect and authenticate
        await client.start()
        
        print()
        print("✅ Successfully authenticated!")
        print()
        
        # Get session string
        session_string = client.session.save()
        
        print("=== Your Session String ===")
        print()
        print(session_string)
        print()
        print("=== Instructions ===")
        print("1. Copy the session string above")
        print("2. Add it to your .env file as:")
        print(f"   TELEGRAM_SESSION_STRING={session_string}")
        print("3. Make sure your .env file also contains:")
        print(f"   TELEGRAM_API_ID={api_id}")
        print(f"   TELEGRAM_API_HASH={api_hash}")
        print()
        print("⚠️  Security Warning:")
        print("   - Keep this session string secure and never share it")
        print("   - It provides full access to your Telegram account")
        print("   - Regenerate if compromised")
        print()
        
        # Save to file for convenience
        session_file = "telethon_session.txt"
        with open(session_file, "w") as f:
            f.write(session_string)
        print(f"📁 Session string also saved to: {session_file}")
        print("   (Remember to delete this file after copying to .env)")
        
    except Exception as e:
        print(f"❌ Error during authentication: {str(e)}")
        print()
        print("Common issues:")
        print("- Invalid API ID or API Hash")
        print("- Network connection problems")
        print("- Incorrect phone number format (use international format: +1234567890)")
        
    finally:
        await client.disconnect()


if __name__ == "__main__":
    try:
        asyncio.run(generate_session())
    except KeyboardInterrupt:
        print("\n\n❌ Operation cancelled by user")
    except Exception as e:
        print(f"\n\n❌ Unexpected error: {str(e)}")