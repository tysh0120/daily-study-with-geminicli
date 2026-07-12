from __future__ import annotations
import threading
from typing import Callable


class PoolClosed(Exception):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)


class Timeout(Exception):
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

    def acquire(self) -> PooledConnection:
        with self._condition:
            try:
                return PooledConnection(self._pool.pop(0), self)

            except IndexError:
                if not self._condition.wait(self._timeout):
                    raise Timeout()
                return PooledConnection(self._pool.pop(0), self)

    def release(self, conn: Connection):
        with self._condition:
            self._pool.append(conn)
            self._condition.notify()

    def close(self):
        for conn in self._all_connections:
            conn.close()
