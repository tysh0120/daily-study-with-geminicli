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
