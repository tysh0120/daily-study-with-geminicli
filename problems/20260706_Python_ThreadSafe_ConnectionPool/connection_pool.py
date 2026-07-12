from __future__ import annotations
import threading
from typing import Callable
import time


class PoolClosed(Exception):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)


class PoolTimeout(Exception):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)


class Connection:
    """モックコネクション"""

    def __init__(self):
        self.is_open = True

    def execute(self, query: str):
        if not self.is_open:
            raise PoolClosed("プールはクローズされました")
        return f"{query} SUCCESS!"

    def close(self):
        self.is_open = False


class PooledConnection:
    def __init__(self, conn: Connection, connection_pool: ConnectionPool) -> None:
        self._conn = conn
        self._connection_pool = connection_pool

    def __enter__(self) -> Connection:
        return self._conn

    def __exit__(self, exec_type, exec_value, traceback) -> None:
        self._connection_pool.release(self._conn)


class ConnectionPool:
    def __init__(self, factory: Callable, max_size: int, timeout: float):
        self._max_size = max_size
        self._timeout = timeout
        self._all_connections = tuple(factory() for _ in range(max_size))
        self._pool = list(self._all_connections)
        self._condition = threading.Condition()
        self._is_open = True

    def acquire(self) -> PooledConnection:
        with self._condition:
            deadline = time.monotonic() + self._timeout
            while self._is_open and len(self._pool) == 0:
                if time.monotonic() >= deadline:
                    raise PoolTimeout("時間切れです")
                self._condition.wait(deadline - time.monotonic())
            if not self._is_open:
                raise PoolClosed("プールはクローズされました!")
            return PooledConnection(self._pool.pop(0), self)

    def release(self, conn: Connection):
        with self._condition:
            if not self._is_open:
                return
            self._pool.append(conn)
            self._condition.notify()

    def close(self):
        with self._condition:
            self._is_open = False
            for conn in self._all_connections:
                conn.close()
            self._condition.notify_all()
