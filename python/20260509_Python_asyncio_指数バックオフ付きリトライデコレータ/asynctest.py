import asyncio

async def hello():
    await asyncio.sleep(1)
    print('hello')

asyncio.run(hello())

