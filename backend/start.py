#!/usr/bin/env python3
import asyncio
import sys
import os

# Prevent uvloop from being imported
sys.modules['uvloop'] = None

# Set environment variables to disable uvloop
os.environ["UVLOOP_DISABLE"] = "1"
os.environ["UVICORN_LOOP"] = "asyncio"

# Force asyncio event loop policy
asyncio.set_event_loop_policy(asyncio.DefaultEventLoopPolicy())

# Now import uvicorn after setting up the environment
import uvicorn

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=False,
        loop="asyncio"
    )