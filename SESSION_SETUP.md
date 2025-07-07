# Telegram Session Setup Guide

This guide will help you set up a Telegram session string for the auto-poster bot to avoid interactive phone number verification during startup.

## Overview

The bot uses Telethon to connect to Telegram as a user account (not a bot) to read messages from channels. To avoid having to enter your phone number and verification code every time the bot starts, you can generate a session string that contains your authentication credentials.

## Prerequisites

1. **Telegram API Credentials**: You need to obtain API credentials from Telegram:
   - Go to https://my.telegram.org/apps
   - Log in with your Telegram account
   - Create a new application
   - Note down your `api_id` and `api_hash`

2. **Python Environment**: Make sure you have Python 3.11+ installed with the required dependencies.

## Step-by-Step Setup

### 1. Obtain API Credentials

1. Visit https://my.telegram.org/apps
2. Log in with your Telegram account (phone number + verification code)
3. Click "Create application"
4. Fill in the required fields:
   - **App title**: Any name (e.g., "Auto Poster Bot")
   - **Short name**: Any short name (e.g., "autoposter")
   - **Platform**: Choose "Desktop"
   - **Description**: Optional
5. Save your `api_id` and `api_hash` - you'll need these

### 2. Generate Session String

1. Navigate to the project root directory
2. Install Telethon if not already installed:
   ```bash
   pip install telethon
   ```
3. Run the session generator script:
   ```bash
   python generate_session_telethon.py
   ```
4. Enter your API credentials when prompted:
   - API ID (number)
   - API Hash (string)
   - Phone number (international format: +1234567890)
5. Enter the verification code sent to your Telegram app
6. Copy the generated session string

### 3. Configure Environment Variables

1. Open your `.env` file
2. Add or update the following variables:
   ```env
   TELEGRAM_API_ID=your_api_id_here
   TELEGRAM_API_HASH=your_api_hash_here
   TELEGRAM_SESSION_STRING=your_session_string_here
   ```

### 4. Restart the Service

1. Stop the current service:
   ```bash
   docker-compose down
   ```
2. Start the service again:
   ```bash
   docker-compose up -d
   ```

### 5. Verify Setup

1. Check the worker logs:
   ```bash
   docker-compose logs worker
   ```
2. You should see successful authentication without any prompts for phone number or verification code
3. Look for messages like:
   ```
   INFO - Telegram client initialized successfully
   INFO - Starting continuous monitoring for X channels
   ```

## Security Considerations

⚠️ **IMPORTANT**: The session string contains your Telegram account authentication data.

- Never share your session string with others
- Don't commit the session string to your git repository
- Regularly regenerate the session string
- Consider using a separate Telegram account for the bot if possible

## Alternative Solutions

If you don't want to use a session string:

1. **Add bot as channel admin** - bots can read messages from channels where they are administrators
2. **Use Telegram Bot API webhooks** - for real-time updates
3. **Set up interactive authentication** - for development environments

## Troubleshooting

### Error "BOT_METHOD_INVALID"
This error means a bot token is being used instead of a user session. Make sure:
- `TELEGRAM_SESSION_STRING` is properly set in `.env`
- Worker container has been restarted
- Session string is valid

### Error "SessionPasswordNeeded"
Two-factor authentication is enabled. Enter your password when generating the session string.

### Error "PhoneCodeInvalid"
Incorrect verification code. Request a new code and try again.

### Error "FloodWaitError"
Too many requests. Wait for the specified time before trying again.

### Session Expired
If the session expires, regenerate it using the same steps above.