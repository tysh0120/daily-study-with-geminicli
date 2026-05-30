"""
✦ 【今日のテーマ】
  Pythonにおける非同期コンテキスト管理 (contextvars)

  【課題：非同期トレースIDの自動伝搬】
  昨日はNode.jsの AsyncLocalStorage を学びましたね。今日はその「Python版」とも言える contextvars
  を使った課題に挑戦しましょう。

  Webアプリケーションなどで、リクエストごとに一意な「トレースID」を生成し、深い階層の関数や、新しく生成した非同期タスク
  内でもそのIDを自動的に参照できる仕組みを構築してください。

  要件：
   1. contextvars.ContextVar を定義し、trace_id を保持できるようにすること。
   2. 擬似的な「ミドルウェア」関数を作成し、リクエスト開始時にUUIDをセットし、終了後に元の状態に戻す（クリーンアップ）ロ
      ジックを実装すること。
   3. リクエスト処理中に呼び出されるネストされた非同期関数から、ContextVar を通じて trace_id
      を取得してログ出力（print）すること。
   4. asyncio.create_task() で起動された「バックグラウンドタスク」内でも、同じ trace_id
      が正しく引き継がれていることを確認すること。
   5. IDが設定されていない場合のデフォルト値（例: "no-id"）を設定すること。
"""
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

