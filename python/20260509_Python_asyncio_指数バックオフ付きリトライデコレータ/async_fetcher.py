"""
  1. 【今日のテーマ】
  Python asyncio による並行処理の制御と、デコレータによる再試行（Retry）ロジックの共通化

  これまでの Node.js での知見（fetch-with-retry など）を Python で「Pythonic」に実装してみましょう。

  2. 【課題：レジリエントな非同期データ取得ツールの作成】
  複数の偽のエンドポイント（シミュレータ）からデータを並行して取得するスクリプト python/async_fetcher.py
  を作成してください。以下の要件を満たす必要があります。

   1. 非同期実行: asyncio と httpx（または aiohttp）を使用して、複数のリクエストを並行して実行すること。
   2. 再試行デコレータ:
      ネットワークエラーや特定のステータスコード（500系など）が発生した際に、指定回数リトライする自作デコレータ @retry
      を実装すること。
   3. 流量制御: 一度に実行されるリクエスト数が一定数（例：3つ）を超えないよう、asyncio.Semaphore
      を使用して制御すること。
   4. エラーハンドリング: すべてのリトライに失敗した場合は、プログラムを落とさずにエラー内容を記録して続行すること。
"""

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

