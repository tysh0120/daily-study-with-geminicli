"""
【今日のテーマ】
  Python：メタクラスによるアーキテクチャの強制と自動プラグイン登録

  【課題：自動登録機能付きの「プラグイン・フレームワーク」を作ってみよう】
  システムに新しい機能（プラグイン）を追加する際、開発者が手動でリストに追加するのではなく、「クラスを定義しただけで」自動的にシステムに認識され
  、かつ最低限必要なルールを守らせる仕組みを実装してください。

  具体的な要件：
   1. メタクラス PluginMount の実装:
      - サブクラスが定義された際、そのクラスを自動的に PluginMount.plugins というリストに登録する。
      - クラス定義時に、そのクラスが execute という名前のメソッドを持っているかチェックし、持っていない場合は TypeError
        を投げる（＝不完全なプラグインの作成を未然に防ぐ）。
   2. ベースクラス BasePlugin:
      - PluginMount をメタクラスとして指定した基底クラス。
   3. プラグインの作成:
      - BasePlugin を継承した具体的なクラスを2つ以上（例：AuditLogPlugin, DataEncryptPlugin）作成してください。
   4. 実行:
      - 登録されたプラグインを一括で実行する関数 run_plugins(data) を作成してください。

  【期待される動作例】

   1 # クラスを定義するだけで...
   2 class MyPlugin(BasePlugin):
   3     def execute(self, data):
   4         return f"Processed: {data}"
   5
   6 # どこかでリストに追加するコードを書かなくても、自動で認識されている
   7 run_plugins("Hello World")
   8 # -> ["Processed: Hello World", ...]
"""
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

