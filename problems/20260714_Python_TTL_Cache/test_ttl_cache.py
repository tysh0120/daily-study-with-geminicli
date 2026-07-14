import unittest

from ttl_cache import TTLCache


class FakeClock:
    def __init__(self) -> None:
        self.now = 0.0

    def __call__(self) -> float:
        return self.now

    def advance(self, seconds: float) -> None:
        self.now += seconds


class TTLCacheTest(unittest.TestCase):
    def setUp(self) -> None:
        self.clock = FakeClock()
        self.cache: TTLCache[str, str] = TTLCache(
            max_size=2,
            clock=self.clock,
        )

    def test_returns_a_stored_unexpired_value(self) -> None:
        self.cache.set("a", "first", ttl=10.0)

        self.assertEqual(self.cache.get("a"), "first")

    def test_raises_key_error_after_the_ttl_expires(self) -> None:
        self.cache.set("a", "first", ttl=10.0)
        self.clock.advance(10.0)

        with self.assertRaises(KeyError):
            self.cache.get("a")

    def test_reading_a_key_prevents_it_from_being_evicted_first(self) -> None:
        self.cache.set("a", "first", ttl=10.0)
        self.cache.set("b", "second", ttl=10.0)
        self.cache.get("a")
        self.cache.set("c", "third", ttl=10.0)
        self.assertEqual(self.cache.get("a"), "first")
        self.assertEqual(self.cache.get("c"), "third")
        with self.assertRaises(KeyError):
            self.cache.get("b")

    def test_replacing_a_value_refreshes_its_ttl(self) -> None:
        self.cache.set("a", "first", ttl=10.0)
        self.clock.advance(9.0)
        self.cache.set("a", "updated", ttl=10.0)
        self.clock.advance(2.0)

        self.assertEqual(self.cache.get("a"), "updated")

    def test_expired_entries_do_not_consume_capacity(self) -> None:
        self.cache.set("a", "first", ttl=1.0)
        self.cache.set("b", "second", ttl=10.0)
        self.clock.advance(1.0)
        self.cache.set("c", "third", ttl=10.0)

        self.assertEqual(len(self.cache), 2)
        self.assertEqual(self.cache.get("b"), "second")
        self.assertEqual(self.cache.get("c"), "third")

    def test_rejects_invalid_capacity_and_ttl(self) -> None:
        with self.assertRaises(ValueError):
            TTLCache[str, str](max_size=0, clock=self.clock)

        with self.assertRaises(ValueError):
            self.cache.set("a", "first", ttl=-1.0)


if __name__ == "__main__":
    unittest.main()
