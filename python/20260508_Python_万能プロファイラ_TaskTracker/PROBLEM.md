1. 【今日のテーマ】
  Pythonicなリソース管理と横断的関心の分離
  （functools.wraps, contextlib, magic methods の活用）

  2. 【課題：万能プロファイラ TaskTracker を作ってみよう】
  特定の処理の実行時間を計測し、さらに「何回呼び出されたか」「累計時間はどれくらいか」を自動で集計するクラス TaskTracker
  を作成してください。

  要件：
   1. デコレータとして使える:

   1    @tracker.track("my_function")
   2    def some_function():
   3        ...
   2. コンテキストマネージャとして使える:

   1    with tracker.track("critical_section"):
   2        # ここで重い処理
   3        ...
   3. 集計機能:
     tracker.report() を呼ぶと、各タスク名ごとの「実行回数」と「平均実行時間」を整形して表示すること。
   4. Pythonic Point:
      - デコレータの実装には functools.wraps を使い、元の関数のメタデータ（関数名やdocstring）を保持すること。
      - コンテキストマネージャの実装には、クラスの __enter__ / __exit__ を使うか、contextlib.contextmanager
        を使ってみてください。
