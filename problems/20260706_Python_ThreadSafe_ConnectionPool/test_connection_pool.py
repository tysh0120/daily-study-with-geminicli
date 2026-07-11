import unittest
import threading
from connection_pool import Connection, ConnectionPool, Timeout
from dataclasses import dataclass
from typing import Callable
import time


@dataclass
class ThreadAndEvent:
    thread: threading.Thread
    event: threading.Event | None


class PoolWorkerThread:
    """ConnectionPoolを利用したスレッドの実行"""

    def __init__(self, pool: ConnectionPool):
        self._pool = pool
        self._results = []
        self._event_to_wait = threading.Event()

    def execute(self, func: Callable):
        def inner_func():
            try:
                with self._pool.acquire() as conn:
                    self._event_to_wait.wait()
                    self._results.append({"result": func(conn)})
            except Exception as e:
                self._results.append({"error": e})

        t = threading.Thread(target=inner_func)
        t.start()
        return t

    def block(self):
        self._event_to_wait.clear()

    def resume(self):
        self._event_to_wait.set()

    def get_results(self):
        return self._results


def exec_conn(conn):
    return conn.execute("QUERY")


class ConnectionPoolTest(unittest.TestCase):
    def setUp(self) -> None:
        self._pool = ConnectionPool(Connection, 2, 0.1)

    def test_acquire(self) -> None:
        pw = PoolWorkerThread(self._pool)
        pw.execute(exec_conn)
        pw.resume()
        time.sleep(0)
        self.assertEqual("QUERY SUCCESS!", pw.get_results()[0]["result"])

    def test_acquire_runs_in_parallel(self):
        pw1 = PoolWorkerThread(self._pool)
        pw2 = PoolWorkerThread(self._pool)
        pw3 = PoolWorkerThread(self._pool)

        pw1.block()
        pw2.block()

        pw1.execute(exec_conn)
        pw2.execute(exec_conn)
        pw3.execute(exec_conn)

        self.assertEqual(0, len(pw1.get_results()))
        self.assertEqual(0, len(pw2.get_results()))
        self.assertEqual(0, len(pw3.get_results()))

        pw1.resume()
        time.sleep(0)
        self.assertEqual("QUERY SUCCESS!", pw1.get_results()[0]["result"])

        pw3.resume()
        time.sleep(0)
        self.assertEqual("QUERY SUCCESS!", pw3.get_results()[0]["result"])

        self.assertEqual(0, len(pw2.get_results()))
        pw2.resume()
        time.sleep(0)
        self.assertEqual("QUERY SUCCESS!", pw2.get_results()[0]["result"])

    def test_acquire_timeout(self):
        pw1 = PoolWorkerThread(self._pool)
        pw2 = PoolWorkerThread(self._pool)
        pw3 = PoolWorkerThread(self._pool)
        pw1.execute(exec_conn)  # 1, 2 は枠内のため即獲得
        pw2.execute(exec_conn)
        pw3.execute(exec_conn)  # 3 は枠外のためwait
        time.sleep(0.2)  # タイムアウト発生
        self.assertIsInstance(pw3.get_results()[0]["error"], Timeout)
        pw1.resume()
        pw2.resume()
        pw3.resume()
