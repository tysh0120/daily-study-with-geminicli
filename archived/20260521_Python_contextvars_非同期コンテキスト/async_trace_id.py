import contextvars
import asyncio
import uuid
import contextlib

id_var = contextvars.ContextVar('id_var', default='no-id')

# フレームワークのメインの想定
async def main():
    # リクエストが3つ来た状況をシミュレート
    tasks = []
    for _ in range(3):
        tasks.append(middleware(request_handler))
    await asyncio.gather(*tasks)

    # まだ残ってるtaskを待ち
    pending_tasks = asyncio.all_tasks()
    pending_tasks.remove(asyncio.current_task())
    await asyncio.gather(*pending_tasks)

@contextlib.contextmanager
def trace_id_context():
    id_token = id_var.set(uuid.uuid4())
    try:
        yield
    finally:
        id_var.reset(id_token)

async def middleware(handler):
    with trace_id_context():
        await handler()

async def request_handler():
    print(f'id: {id_var.get()} started')
    await asyncio.sleep(1)
    task = asyncio.create_task(background_task())
    print(f'id: {id_var.get()} finished')

async def background_task():
    print(f'id: {id_var.get()} background task started')
    await asyncio.sleep(3)
    print(f'id: {id_var.get()} background task finished')

asyncio.run(main())

