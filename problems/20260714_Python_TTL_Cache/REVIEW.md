# TTLCache
## 2026-07-15
Because you tald to me in English, I will write in poor English, for English study.
Please point out unclear English expression also..

Implemented TTL Cache.
Because I got feedback regarding "check-and-act" atomicity violation,
I added lock to such methods.

## Review (2026-07-15)

### Correctness: Needs revision

- New keys are appended at the end, while `get()` treats the end as the least
  recently used position. As a result, with capacity 2, after `set(a)`,
  `set(b)`, `get(a)`, `set(c)`, and `set(d)`, `c` is evicted even though `a`
  is the least recently used entry. Choose one consistent position for the
  most recently used entry when inserting, updating, and reading, then add a
  test for this sequence.
- `set()` refreshes the TTL of an existing key, but it does not refresh its LRU
  position. If updating is a use, add it to the same test.

### Readability: Good

- `FakeClock` makes time-dependent tests deterministic. Adding a lock is also
  an appropriate way to avoid check-and-act races.
- `_queue` is a cache, and each `ttl` stores an expiration deadline. Names
  that describe those roles would make the implementation easier to follow.

### Efficiency: Needs revision

- Rebuilding the dictionary in `get()` and making a list of all keys to evict
  an entry are both proportional to cache size. Look for a standard-library
  container that can reorder and remove entries at either end in constant time.

### English

- "Because you tald to me in English, I will write in poor English, for
  English study." -> "Because you told me to write in English, I will write in
  imperfect English to practice."
- "Please point out unclear English expression also." -> "Please point out any
  unclear English expressions as well."
