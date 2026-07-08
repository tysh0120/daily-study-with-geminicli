import time
from typing import Callable


class PoolClosed(Exception):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)


class Connection:
    """モックコネクション"""

    def __init__(self):
        self.is_open = True

    def execute(self, query: str):
        if not self.is_open:
            raise PoolClosed("プールはクローズされました")
        time.sleep(1)
        return f"result of {query}"

    def close(self):
        self.is_open = False


class ConnectionPool:
    def __init__(self, factory: Callable, max_size: int, timeout: float):
        self._factory = factory
        self._max_size = max_size
        self._timeout = timeout

    def acquire(self):
        pass

    def release(self):
        pass
