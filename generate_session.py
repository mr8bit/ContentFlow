#!/usr/bin/env python3
"""
Script to generate Telegram session string for Pyrogram.
This script will help you create a session string that can be used
to authenticate without interactive phone number verification.

Usage:
1. Run this script: python generate_session.py
2. Enter your phone number and verification code
3. Copy the generated session string to your .env file as TELEGRAM_SESSION_STRING
"""

import os
import sys
from pyrogram import Client
from pyrogram.errors import SessionPasswordNeeded

def main():
    # Load environment variables
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except ImportError:
        print("Warning: python-dotenv not installed. Make sure to set environment variables manually.")
    
    # Get API credentials from environment
    api_id = os.getenv('TELEGRAM_API_ID')
    api_hash = os.getenv('TELEGRAM_API_HASH')
    
    if not api_id or not api_hash:
        print("Error: TELEGRAM_API_ID and TELEGRAM_API_HASH must be set in .env file")
        print("Get these from https://my.telegram.org/apps")
        sys.exit(1)
    
    try:
        api_id = int(api_id)
    except ValueError:
        print("Error: TELEGRAM_API_ID must be a valid integer")
        sys.exit(1)
    
    print("Generating Telegram session string...")
    print("You will need to enter your phone number and verification code.")
    print()
    
    # Create client with in-memory session
    client = Client(":memory:", api_id=api_id, api_hash=api_hash)
    
    try:
        # Start the client (this will prompt for phone and code)
        client.start()
        
        # Export session string
        session_string = client.export_session_string()
        
        print("\n" + "="*60)
        print("SUCCESS! Your session string:")
        print("="*60)
        print(session_string)
        print("="*60)
        print()
        print("Add this to your .env file:")
        print(f"TELEGRAM_SESSION_STRING={session_string}")
        print()
        print("After adding the session string to .env, restart your worker container:")
        print("docker-compose restart worker")
        
    except SessionPasswordNeeded:
        print("\nTwo-factor authentication is enabled on your account.")
        password = input("Please enter your 2FA password: ")
        try:
            client.check_password(password)
            session_string = client.export_session_string()
            
            print("\n" + "="*60)
            print("SUCCESS! Your session string:")
            print("="*60)
            print(session_string)
            print("="*60)
            print()
            print("Add this to your .env file:")
            print(f"TELEGRAM_SESSION_STRING={session_string}")
            
        except Exception as e:
            print(f"Error with 2FA password: {e}")
            sys.exit(1)
            
    except Exception as e:
        print(f"Error generating session: {e}")
        sys.exit(1)
        
    finally:
        # Stop the client
        try:
            client.stop()
        except:
            pass

if __name__ == "__main__":
    main()