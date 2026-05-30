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
