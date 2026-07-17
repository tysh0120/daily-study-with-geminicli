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

## 2026-07-15 
### features
- Fixed the problem of inconsistent LRU posision between set() and get().
  I decided to use following posisioning rule: left: old <--->  right: new
  This will effective for the efficiency problem: rebuilding the dictionary in `get()`

### English lesson
- I told you to check my imperfect English and point out the imperfect expression if any.
- Please check atomic consistency as well.

## Review (2026-07-15, Follow-up)

### Correctness: Good

- The rule that the left side is least recent and the right side is most recent
  is now consistent between `set()` and `get()`. Updating an entry also moves
  it to the right, so the previous LRU ordering issue is resolved.
- Adding a capacity test after an update with `FakeClock` is a good improvement.

### Readability: Needs minor revision

- Remove the unused `move_to_top()` function. Its "top" terminology also
  conflicts with the current rule that the rightmost entry is most recent.

### Efficiency: Needs revision

- `get()` no longer rebuilds the dictionary, which is an improvement. However,
  `list(self._cache.keys())[0]` creates a list of every key when eviction needs
  only the first one, making it O(n). Since the dictionary preserves order,
  find a way to retrieve only its first key through an iterator.

### English

- "Fixed the problem of inconsistent LRU posision between set() and get()." ->
  "Fixed the inconsistency in LRU positioning between `set()` and `get()`."
- "I decided to use following posisioning rule" -> "I decided to use the
  following positioning rule: left: oldest <--> right: newest."
- "This will effective for the efficiency problem" -> "This addresses the
  dictionary-rebuilding efficiency issue in `get()`."
- "I told you to check my imperfect English..." -> "Please check my English
  and point out any unclear expressions."
- "Please check atomic consistency as well." -> "Please also check for
  atomicity issues."

## 2026-07-16 
### features
- Fixed the inefficient processing while determining the leftmost key in the dictionary.

## Review (2026-07-17)

### Correctness: Needs minor revision

- The previous LRU and eviction-cost issues are resolved. `next(iter(...))`
  retrieves only the least recently used key, and the unused helper has been
  removed.
- `get()` detects an expired entry but leaves it in `_cache` before raising
  `KeyError`. Delete that entry before raising the exception so expiration is
  handled consistently by the public operation that discovers it.

### Readability: Good

- The leftmost-oldest / rightmost-newest rule is reflected clearly in the
  insertion, access, and eviction code.

### Efficiency: Needs minor revision

- The first-key lookup is now O(1), as intended.
- Removing an expired key in `get()` also prevents repeated failed reads of
  the same key from repeatedly scanning all cache entries through
  `_expired_keys()`.

## 2026-07-16 
### Features
- Added the removal logic to `get()`: If an entry is expired, remove it from the cache

## Review (2026-07-17, Approved)

### Correctness: Good

- `get()` checks only the requested key, removes it when expired, and then
  raises `KeyError`. Normal reads no longer scan the entire cache.
- The implementation satisfies TTL handling, LRU ordering, TTL refresh on
  updates, capacity eviction, and input validation requirements.

### Readability: Good

- The leftmost-oldest / rightmost-newest ordering rule is applied consistently
  throughout the implementation.

### Efficiency: Good

- Normal `get()` calls perform only a lookup, expiration check, and ordering
  update. Expired-entry cleanup needed for capacity decisions is limited to
  `set()`.

Approved.
