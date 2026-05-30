"""
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
"""
import time
import functools

class TaskTrackingCtxtMgr:
    def __init__(self):
        self.total_count = 0
        self.amount_time = 0

    def __enter__(self):
        self.total_count += 1
        self.start_time = time.perf_counter()

    def __exit__(self, *err):
        self.amount_time += time.perf_counter() - self.start_time

    def report(self):
        if self.total_count > 0:
            print(f"called {self.total_count} times\naverage time: {self.amount_time / self.total_count}")
        else:
            print(f"no record")

    def __call__(self, f):
        @functools.wraps(f)
        def wrapper(*args, **kwargs):
            with self:
                return f(*args, **kwargs)
        return wrapper

class TaskTracker:
    def __init__(self):
        self.ctxt_mgrs = {}

    def _get_or_create_manager(self, task_name):
        if not task_name in self.ctxt_mgrs:
            self.ctxt_mgrs[task_name] = TaskTrackingCtxtMgr()
        return self.ctxt_mgrs[task_name]

    def track(self, task_name, f = None):
        return self._get_or_create_manager(task_name)

    def report(self):
        for task_name in self.ctxt_mgrs:
            print(task_name)
            self.ctxt_mgrs[task_name].report()

if __name__ == "__main__":
    tracker = TaskTracker()

    @tracker.track('task1')
    def f():
        print('task 1 running')
    # デコレータの挙動確認
    f()

    # コンテキストマネージャの挙動確認
    with tracker.track('task2'):
        print('task2 running')

    tracker.report()

    # 実感するための遊び
    decorator = tracker.track('task3')
    decorator(print)('ttt')

    tracker.report()
