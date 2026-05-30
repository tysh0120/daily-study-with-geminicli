import asyncio
import httpx
import functools
import random # 動作確認用

# デコレーターを返す関数
def retry(retries=3, delay=1, concurrent=2):
    def decolator(func):
        sem = asyncio.Semaphore(concurrent)
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            async with sem:
                n_retry = 0
                err = None
                for i in range(retries):
                    try:
                        return await func(*args, **kwargs)
                    except Exception as e:
                        n_retry += 1
                        await asyncio.sleep(delay * (2**i))
                        print(f'{e} retrying')
                        err = e
                raise err
        return wrapper
    return decolator
 
@retry(3,1)
async def fetch_url(url, name='task'):
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        print(response.text[0:20])
        return f'{name} success';

urls = [
    'https://google.com',
    'https://yahoo.com',
    'https://calapan.shop',
    'https://megumi-genki.com',
    'https://python.com',
]

async def execute_tasks(n):
    print(await asyncio.gather(
        *[fetch_url(urls[i%5], f'task {i}') for i in range(n)],
        return_exceptions=True
    ))
asyncio.run(execute_tasks(10))

