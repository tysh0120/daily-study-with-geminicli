"""
✦ 【今日のテーマ】
  Python: asyncio.Queue を活用した堅牢な「生産者・消費者（Producer-Consumer）」パターン

  【課題：非同期ログ・プロセッサーを作ってみよう】
  大量の「ログメッセージ」を生成するシミュレータ（生産者）と、それを受け取って「解析・保存」をシミュレートする（消費者）
  システムを構築してください。

  要件：
   1. 複数の消費者（Workers）: 3つ以上の並列ワーカーが同時にログを処理すること。
   2. 流量制限（Backpressure）:
      キューの最大サイズ（maxsize）を指定し、生産者が過剰にデータを生成してメモリを圧迫するのを防ぐこと。
   3. 終了処理（Graceful Shutdown）:
      全てのログが生成された後、キューに残っているデータを全て処理しきってから、ワーカーが安全に終了すること。
   4. エラーハンドリング: 特定のログ処理でエラーが発生しても、システム全体が停止せず、他のログの処理を継続できること。
   5. 統計の出力: 全ての処理が完了した際、各ワーカーが何件のログを処理したかの内訳を表示すること。

  前回の LRU キャッシュの課題では「Task
  のキャッシュ」という高度な概念を扱いましたが、今回は「非同期システムにおけるデータの流れと終了の制御」が主眼です。
"""
import asyncio
from asyncio import TaskGroup
import random

class Producer:
    def __init__(self, queue):
        self.queue = queue

    async def _produce(self, n):
        await self.queue.put(f'message {n}')
    
    async def run(self, n): # n回メッセージを登録
        for i in range(n):
            await self._produce(i)
        # await self.queue.join()
        self.queue.shutdown(immediate=False)

class Worker:
    def __init__(self, queue, id='worker'):
        self.queue = queue
        self.id = id
        self.success = 0
        self.errors = 0

    async def run(self):
        while True:
            try:
                await self.process_log()
                self.success += 1
            except Exception as e:
                if isinstance(e, asyncio.QueueShutDown):
                    print(f'{self.id} 終了 処理件数:{self.success + self.errors}件 成功:{self.success}件 失敗:{self.errors}件')
                    return
                else:
                    self.errors += 1
                    print(f'エラー発生 {e}')

    async def process_log(self):
        log = await self.queue.get()
        print(f'{self.id} processing: {log}')
        result = await self.analyze(log)
        # self.queue.task_done()
        if random.random() < 0.3:
            raise RuntimeError('ログ処理中にエラー発生')

    async def analyze(self, log):
        await asyncio.sleep(0.5 + 0.5*random.random())

async def main():
    queue = asyncio.Queue(maxsize=5)
    producer = Producer(queue)
    workers = [Worker(queue, f'worker_{i}') for i in range(3)]
    
    async with TaskGroup() as tg:
        tg.create_task(producer.run(10))
        for worker in workers:
            tg.create_task(worker.run())

asyncio.run(main())

