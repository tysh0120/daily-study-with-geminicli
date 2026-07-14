# Today’s Theme

Python: time-aware state management with TTL and LRU eviction

## Challenge: Build a TTL Cache

Implement an in-memory cache that expires values after a specified lifetime and
evicts the least recently used value when it reaches capacity.

## Requirements

Implement `TTLCache` in `ttl_cache.py`.

```python
cache = TTLCache[str](max_size=2, clock=clock)
cache.set("user:1", "Alice", ttl=10.0)
cache.get("user:1")  # "Alice"
```

1. `TTLCache(max_size, clock)`:
   - `max_size` must be greater than zero; otherwise raise `ValueError`.
   - `clock` is a callable that returns the current time as a `float`.
   - The default clock must be suitable for measuring elapsed time.
2. `set(key, value, ttl)`:
   - Store `value` under `key` until `ttl` seconds have elapsed.
   - `ttl` must not be negative; otherwise raise `ValueError`.
   - Setting an existing key replaces its value and expiration time.
3. `get(key)`:
   - Return the stored value when the key exists and has not expired.
   - Raise `KeyError` when the key does not exist or has expired.
   - A successful read counts as use for LRU ordering.
4. Capacity:
   - When a new key would exceed `max_size`, remove the least recently used
     unexpired entry.
   - Expired entries must not consume capacity.
5. `__len__()`:
   - Return the number of unexpired entries.
   - Expired entries may be removed lazily by public operations.

## Constraints

- Use only the Python standard library.
- Do not wait with `sleep()` in tests. Pass a controllable clock instead.
- Keep cache internals private.

## Suggested Implementation Order

1. Model one entry with its value and expiration deadline.
2. Implement validation and basic `set()` / `get()` behavior.
3. Add expiration cleanup.
4. Add LRU ordering and eviction.
5. Run the tests and refine edge cases.

## Hints

<details>
<summary>Hint 1: choosing a clock</summary>

Use `time.monotonic` as the default. Unlike wall-clock time, it is intended for
measuring elapsed durations.

</details>

<details>
<summary>Hint 2: expiration boundary</summary>

Decide which comparison makes a value unavailable exactly at its deadline, then
apply it consistently in every public operation.

</details>

<details>
<summary>Hint 3: LRU</summary>

`collections.OrderedDict` can represent access order. Think about which
operation moves an item from its current position to the most-recent position.

</details>

## Completion Checklist

- [ ] Basic set and get work.
- [ ] Expired values raise `KeyError`.
- [ ] Reads change eviction order.
- [ ] Updates refresh TTL and usage order.
- [ ] Invalid capacity and TTL values raise `ValueError`.
- [ ] All tests pass.

After implementation, create `REVIEW.md` describing your design choices and
commit your work before requesting a review.
