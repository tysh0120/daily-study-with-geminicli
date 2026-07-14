from __future__ import annotations

import time
from collections.abc import Callable, Hashable
from typing import Generic, TypeVar
import threading

K = TypeVar("K", bound=Hashable)
V = TypeVar("V")


class TTLCache(Generic[K, V]):
    def __init__(
        self,
        max_size: int,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        if max_size <= 0:
            raise ValueError()
        self._max_size = max_size
        self._clock = clock
        self._queue = {}
        self._lock = threading.RLock()

    def set(self, key: K, value: V, ttl: float) -> None:
        if ttl < 0:
            raise ValueError()
        with self._lock:
            self._delete_expired()
            if key in self._queue or len(self._queue) < self._max_size:
                self._queue[key] = dict(value=value, ttl=self._clock() + ttl)
            else:
                # remove last entry in queue (queue is sorted by Last Used Time)
                least_used_key = list(self._queue.keys())[-1]
                del self._queue[least_used_key]
                # add specified entry to top
                self._queue[key] = dict(value=value, ttl=self._clock() + ttl)

    def get(self, key: K) -> V:
        with self._lock:
            if key not in self._queue or key in self._expired_keys():
                raise KeyError()
            # move to front (LRU)
            entry = self._queue[key]
            del self._queue[key]
            self._queue = {**{key: entry}, **self._queue}
            return self._queue[key]["value"]

    def _expired_keys(self):
        now = self._clock()
        return [k for k in self._queue if self._queue[k]["ttl"] <= now]

    def _delete_expired(self):
        with self._lock:
            for key in self._expired_keys():
                del self._queue[key]

    def __len__(self) -> int:
        with self._lock:
            return len(self._queue) - len(self._expired_keys())
