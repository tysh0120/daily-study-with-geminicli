"""
✦ 【今日のテーマ】
  Python: 非同期処理と効率的なキャッシュアルゴリズム（Async LRU Cache）

  【課題：非同期LRUキャッシュ・デコレータを作ってみよう】
  非同期関数（async def）の実行結果をキャッシュし、計算コストやネットワークIOを削減するデコレータを実装してください。

  要件
   1. LRU (Least Recently Used) 方式: 指定した最大容量（maxsize）を超えた場合、最も古く参照されたデータを削除すること。
   2. 非同期対応: async def な関数に適用でき、await 可能なオブジェクトを返すこと。
   3. キーの管理: 関数の引数（args, kwargs）をキャッシュのキーとして適切に扱えること。
   4. Pythonicな実装: functools.lru_cache のような使い勝手を目指してください。

  使用イメージ

   1 @async_lru_cache(maxsize=3)
   2 async def get_data(key):
   3     print(f"Fetching {key}...")
   4     await asyncio.sleep(1)
   5     return f"Data for {key}"
"""
import functools
import asyncio
import collections

def async_lru_cache(maxsize):
    def deco(f):
        cache = collections.OrderedDict()
        @functools.wraps(f)
        async def wrapper(*args, **kwargs):
            key = (tuple(args), tuple(sorted(kwargs.items())))
            print(f'key:{key}')
            if key in cache:
                print('cache hit')
                cache.move_to_end(key)   # 末尾に移動（末尾: 最新)
            else:
                print('not in cache')
                res = asyncio.create_task(f(*args, **kwargs))
                if len(cache) == maxsize:
                    print('cache size exceeded')
                    cache.popitem(last=False)     # 先頭を削除(先頭:最古)
                cache[key] = res
                print('cacheの内容', cache.keys())
            return await cache[key]
        return wrapper
    return deco

@async_lru_cache(5)
async def fib(n):
    if n == 1 or n == 2:
        return 1
    await asyncio.sleep(0.1)
    return await fib(n-1) + await fib(n-2)

asyncio.run(fib(10))

