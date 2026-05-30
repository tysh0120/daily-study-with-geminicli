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

