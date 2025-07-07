import asyncio
from telegram_service import TelegramService

async def test_client():
    ts = TelegramService()
    if ts.client:
        try:
            await ts.client.start()
            print('Client started successfully')
            await ts.client.stop()
            print('Client stopped successfully')
        except Exception as e:
            print(f'Error with client: {e}')
            import traceback
            traceback.print_exc()
    else:
        print('Client not available')

if __name__ == '__main__':
    asyncio.run(test_client())