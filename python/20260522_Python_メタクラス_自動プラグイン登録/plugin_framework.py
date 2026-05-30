import asyncio
import random

class PluginMount(type):
    plugins = []
    def __new__(mcs, name, bases, attrs):
        gencls = super().__new__(mcs, name, bases, attrs)
        if name != "BasePlugin":
            if not hasattr(gencls, 'execute'):
                #if not 'execute' in attrs and not any(hasattr(base, 'execute') for base in bases):
                raise TypeError('execute が定義されていません')
            PluginMount.plugins.append(gencls)
        return gencls

class BasePlugin(metaclass=PluginMount):
    pass

class AuditLogPlugin(BasePlugin):
    async def execute(self, data):
        await asyncio.sleep(0.5 + random.random())
        return f'autit {data}'

class DataEncryptPlugin(BasePlugin):
    async def execute(self, data):
        await asyncio.sleep(0.5 + random.random())
        return 'encrypted' + data

class DataProcessPlugin(DataEncryptPlugin):
    pass

#class DataNGPlugin(BasePlugin):
#    pass


PluginMount.plugins

async def run_plugins(data):
    return await asyncio.gather(*[cls().execute(data) for cls in PluginMount.plugins])

async def main():
    print(await run_plugins('test'))

asyncio.run(main())

