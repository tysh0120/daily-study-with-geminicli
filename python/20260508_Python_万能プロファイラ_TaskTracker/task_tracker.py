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
