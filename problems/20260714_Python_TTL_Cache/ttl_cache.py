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
        self._cache = {}
        self._lock = threading.RLock()

    def set(self, key: K, value: V, ttl: float) -> None:
        if ttl < 0:
            raise ValueError()
        with self._lock:
            self._delete_expired()
            if key in self._cache:
                del self._cache[key]
            elif len(self._cache) == self._max_size:
                # remove the leftmost position (cache is sorted by Last Used Time ascending)
                del self._cache[next(iter(self._cache))]
            # add specified entry to the rightmost position
            self._cache[key] = dict(value=value, ttl=self._clock() + ttl)

    def get(self, key: K) -> V:
        with self._lock:
            if key not in self._cache:
                raise KeyError()
            now = self._clock()
            if self._cache[key]["ttl"] <= now:
                del self._cache[key]
                raise KeyError()
            # move to the rightmost (inverse LRU)
            self._cache[key] = self._cache.pop(key)
            return self._cache[key]["value"]

    def _expired_keys(self):
        with self._lock:
            now = self._clock()
            return [k for k in self._cache if self._cache[k]["ttl"] <= now]

    def _delete_expired(self):
        with self._lock:
            for key in self._expired_keys():
                del self._cache[key]

    def __len__(self) -> int:
        with self._lock:
            return len(self._cache) - len(self._expired_keys())
