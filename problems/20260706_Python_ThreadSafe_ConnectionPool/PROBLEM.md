# 課題：マルチスレッド対応コネクションプール

## 背景と目的

実務開発では、データベースやAPI接続などの限られたリソースを複数のスレッドが同時にアクセスします。これらのリソースを効率的かつ安全に管理するのが **コネクションプール** です。

本課題では、Python の `threading` モジュールを使って、以下を満たす堅牢なコネクションプールを実装します：

- ✅ 複数スレッドからの同時アクセスに対応（スレッドセーフ）
- ✅ 接続数上限管理と待機キュー
- ✅ タイムアウト機能（取得に一定時間以上かかったら例外）
- ✅ コンテキストマネージャ対応（`with` 構文での自動返却）
- ✅ リソースリークの防止

---

## 要件

### 機能要件

1. **`ConnectionPool` クラス**
   ```python
   pool = ConnectionPool(
       factory=lambda: MockConnection(),  # コネクション作成ファクトリ
       max_size=5,                        # 最大コネクション数
       timeout=2.0                        # 取得タイムアウト（秒）
   )
   ```

2. **`acquire()` メソッド**
   - 利用可能なコネクションを取得する
   - 利用可能なコネクションがない場合は、新規作成（上限まで）
   - 上限に達した場合は、別のスレッドが返却するまで待機
   - タイムアウト時は `TimeoutError` 例外を発生

3. **`release(conn)` メソッド**
   - 使用済みコネクションをプールに返却する
   - 待機中のスレッドがあれば、そのスレッドに通知

4. **コンテキストマネージャ対応**
   ```python
   with pool.acquire() as conn:
       conn.execute("SELECT * FROM users")
   # 自動的に返却される
   ```

5. **`close()` メソッド**
   - プール内のすべてのコネクションをクローズする
   - 待機中のスレッドに `PoolClosed` 例外を発生させる

### 非機能要件

- **スレッド安全性**: `threading.Lock` / `threading.Condition` を使用してデータ競合を防止
- **デッドロック防止**: タイムアウト機能による無限待機の回避
- **リソースリーク**: プール内のコネクションが確実にクローズされる
- **テスト可能性**: モック可能なコネクション設計

---

## 期待される成果物

```
problems/20260706_Python_ThreadSafe_ConnectionPool/
├── PROBLEM.md              (このファイル)
├── connection_pool.py      (実装ファイル)
├── test_connection_pool.py (テストファイル)
└── REVIEW.md               (レビュー記録 - 実装後に作成)
```

### `connection_pool.py` に含まれるべき要素

```python
class Connection:
    """モック用コネクション（テスト時に実装）"""
    def execute(self, query: str) -> str:
        pass
    
    def close(self) -> None:
        pass


class PoolClosed(Exception):
    """プール終了時の例外"""
    pass


class ConnectionPool:
    def __init__(self, factory: Callable, max_size: int, timeout: float):
        # ...
    
    def acquire(self) -> Connection:
        # ← コンテキストマネージャ対応（`__enter__` / `__exit__`）
        pass
    
    def release(self, conn: Connection) -> None:
        pass
    
    def close(self) -> None:
        pass
```

### テストに含まれるべき項目

- [ ] 単一スレッドでの基本動作（取得・返却）
- [ ] 複数スレッド同時アクセス（データ競合検証）
- [ ] タイムアウト動作（待機時間を超えたら `TimeoutError`）
- [ ] `with` 構文での自動返却
- [ ] `close()` 後の動作（例外発生）
- [ ] リソースリーク検証（すべてのコネクションがクローズされたか）

---

## ヒント（必要に応じて）

1. **スレッド間通信**: `threading.Condition` を使うと、「コネクション返却を待機するスレッド」に効率的に通知できます

2. **コンテキストマネージャ**: 
   ```python
   from contextlib import contextmanager
   
   @contextmanager
   def acquire(self):
       conn = # コネクション取得
       try:
           yield conn
       finally:
           self.release(conn)
   ```

3. **タイムアウト実装**: `threading.Condition.wait(timeout)` が便利

4. **状態管理**: `self._closed` フラグで「プール終了状態」を管理

---

## 学習ポイント

この课題を通じて、以下を習得します：

- ✅ `threading.Lock`, `threading.Condition` の使い分け
- ✅ コンテキストマネージャによるリソース自動管理
- ✅ スレッドセーフなデータ構造設計
- ✅ タイムアウト機構の実装
- ✅ マルチスレッド環境でのテスト戦略

---

## 推奨実装手順

1. `Connection` クラスの設計（モック用）
2. `ConnectionPool` の基本骨組み（初期化、acquire/release の同期化なし）
3. `threading.Condition` を使った同期化の追加
4. コンテキストマネージャ対応
5. テストの作成・実行
6. `close()` メソッドとエラーハンドリング

---
