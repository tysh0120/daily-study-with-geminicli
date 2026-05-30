import asyncio
from contextlib import asynccontextmanager
from asyncio import TaskGroup

class AsyncResourcePool:
    def __init__(self, resources):
        self._queue = asyncio.Queue(maxsize=len(resources))
        for resource in resources:
            self._queue.put_nowait(resource)
            print(f'resource {resource} pushed')

    @asynccontextmanager
    async def acquire(self):
        resource = None
        try:
            resource = await self._queue.get()
            print(resource)
            yield resource
        finally:
            if resource:
                print(f'{resource} pushed back')
                await self._queue.put(resource)

async def main():
    pool = AsyncResourcePool([1,2,3])
    tg = TaskGroup()
    tasks = []
    await consume(pool)

async def consume(pool):
    async with asyncio.TaskGroup() as tg:
        for id in range(1, 11):
            print(f'{id} consuming')
            tg.create_task(task(id, pool))

async def task(id, pool):
    async with pool.acquire() as resource:
        print(f'id: {id} resource: {resource} execute')
        await asyncio.sleep(resource)

asyncio.run(main())

