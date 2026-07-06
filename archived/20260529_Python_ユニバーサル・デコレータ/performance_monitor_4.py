"""
 【今日のテーマ】
  Pythonの高度なデコレータ：引数付きデコレータと「状態」の動的制御

  【課題：動的閾値付きパフォーマンスモニター】
  関数の実行時間を計測し、設定された閾値を超えた場合にログを出力するデコレータ @monitor を実装してください。
  ただし、単なる計測ではなく、以下のプロフェッショナルな要件を満たす必要があります。

   1. 引数による初期化: @monitor(threshold=0.5) のように、警告を出す閾値（秒）をデコレータ適用時に指定できること。
   2. 動的な挙動変更: デコレータを適用した後でも、その関数に対して func.set_threshold(1.0)
      のように呼び出すことで、実行時に閾値を変更できるようにしてください。
   3. メタデータの完全な継承: functools.wraps
      を使用し、元の関数の名前、ドキュメント、シグネチャが正しく保持されていること。
   4. 非同期対応（オプション）: もし余裕があれば、通常の関数だけでなく async def
      の関数にも適用できるように検討してみてください。

  【期待するコードの利用イメージ】

   1 @monitor(threshold=0.1)
   2 def heavy_task():
   3     time.sleep(0.2)  # ここで警告が出る
   4
   5 heavy_task()
   6
   7 # 実行中に閾値を変更
   8 heavy_task.set_threshold(0.3)
   9 heavy_task()  # 今度は0.2秒なので警告が出ない
"""
import functools
import time
import contextlib
import asyncio

class MonitorContext:
    def __init__(self, threshold):
        self.threshold = threshold

    def __enter__(self):
        self.start = time.perf_counter()

    def __exit__(self, exec_type, exec_value, traceback):
        self.end = time.perf_counter()
        if self.end - self.start > self.threshold:
            print(f'警告: {self.threshold}s を超えた')

    async def __aenter__(self):
        self.__enter__()

    async def __aexit__(self, exec_type, exec_value, traceback):
        self.__exit__(exec_type, exec_value, traceback)

def monitor(threshold):
    def decorator(f):
        @functools.wraps(f)
        def wrapper(*args, **kwargs):
            with MonitorContext(threshold):
                return f(*args, **kwargs)

        @functools.wraps(f)
        async def async_wrapper(*args, **kwargs):
            async with MonitorContext(threshold):
                return await f(*args, **kwargs)

        def set_threshold(new_threshold):
            nonlocal threshold
            threshold = new_threshold

        func_to_rtn = async_wrapper if asyncio.iscoroutinefunction(f) else wrapper
        func_to_rtn.set_threshold = set_threshold
        return func_to_rtn
    return decorator

@monitor(0.3)
def heavy_task(wait):
    """ これは重たい仕事です """
    time.sleep(wait)
    return 'おわり'

print(heavy_task.__doc__)
heavy_task(0.2)
heavy_task.set_threshold(0.1)
print(heavy_task(0.2))

@monitor(0.3)
async def async_heavy_task(wait):
    """ これは非同期の重たい仕事です """
    await asyncio.sleep(wait)
    return 'おわり'

async def main():
    print(async_heavy_task.__doc__)
    await async_heavy_task(0.1)
    await async_heavy_task(0.5)
    async_heavy_task.set_threshold(0.4)
    print('threshold: 0.4に変更')
    await async_heavy_task(0.3)
    await async_heavy_task(0.5)

asyncio.run(main())


