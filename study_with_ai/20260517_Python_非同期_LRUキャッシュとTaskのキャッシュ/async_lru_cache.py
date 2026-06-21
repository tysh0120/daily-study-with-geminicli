import functools
import asyncio
import collections

def async_lru_cache(maxsize):
    def deco(f):
        cache = collections.OrderedDict()
        @functools.wraps(f)
        async def wrapper(*args, **kwargs):
            key = (tuple(args), tuple(sorted(kwargs.items())))
            print(f'key:{key}')
            if key in cache:
                print('cache hit')
                cache.move_to_end(key)   # 末尾に移動（末尾: 最新)
            else:
                print('not in cache')
                res = asyncio.create_task(f(*args, **kwargs))
                if len(cache) == maxsize:
                    print('cache size exceeded')
                    cache.popitem(last=False)     # 先頭を削除(先頭:最古)
                cache[key] = res
                print('cacheの内容', cache.keys())
            return await cache[key]
        return wrapper
    return deco

@async_lru_cache(5)
async def fib(n):
    if n == 1 or n == 2:
        return 1
    await asyncio.sleep(0.1)
    return await fib(n-1) + await fib(n-2)

asyncio.run(fib(10))

