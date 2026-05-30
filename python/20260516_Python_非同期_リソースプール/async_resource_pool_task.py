"""
 1. 【今日のテーマ】
  Python: 非同期リソースプール（Async Resource Pool）の実装
  データベース接続やネットワークソケットなど、限られた数のリソースを効率よく使い回すための仕組みを、asyncio と contextlib
  を使って自作してみましょう。

  2. 【課題：リソースプールをシミュレーションしてみよう】
  以下の要件を満たす AsyncResourcePool クラスを実装してください。

  要件:
   1. リソースの制限: インスタンス化の際に max_size（最大リソース数）を指定できること。
   2. 取得と返却: async with pool.acquire() as resource:
      という構文でリソースを取得し、ブロックを抜けると自動的にプールへ返却されること。
   3. 待機処理: 全てのリソースが使用中の場合、リソースが返却されるまで acquire() は非同期に待機すること。
   4. 内部構造: リソースの管理には asyncio.Queue を利用してください。
   5. テストコード: 複数のタスクが同時にリソースを要求し、正しく順番待ちが発生することを確認するコードを書いてください。
"""
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

