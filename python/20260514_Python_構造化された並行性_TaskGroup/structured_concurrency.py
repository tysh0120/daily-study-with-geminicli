import asyncio
import random

async def fetch_data(source_id: int):
    print(f'[Start] {source_id}')

    try:
        await asyncio.sleep(0.5 + random.random()*1.5)
        print(f'fulfilled {source_id}')
        if source_id == 3:
            raise RuntimeError('fetch_data失敗')
        else:
            return f'{source_id} success'
    except asyncio.CancelledError as e:
        print(f'[Cancelled] {source_id}')
        raise e

async def main():
    try:
        async with asyncio.TaskGroup() as tg:
            tasks = [tg.create_task(fetch_data(i)) for i in range(1, 6)]

    except* RuntimeError as eg:
        for e in eg.exceptions:
            print(e)
    finally:
        return [task.result() for task in tasks if not task.cancelled() and not task.exception()]

print(asyncio.run(main()))

