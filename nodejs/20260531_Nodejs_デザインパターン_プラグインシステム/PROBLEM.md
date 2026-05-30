# 今日のテーマ
Node.js: 拡張可能なアーキテクチャのための「フック（Hook）システム」の実装

# 課題：プラグイン可能な処理エンジンを作ってみよう
WebpackやFastify、ESLintなどの大規模なライブラリで採用されている「プラグインシステム」の核となる、フック（Hook）機能を実装してください。
本体のロジックを汚さずに、外部から特定のタイミングで処理を割り込ませたり、データを加工したりできる仕組みを目指します。

### 要件
以下の3種類のフックを持つ `HookSystem` クラス、またはそれぞれのフッククラスを作成してください。

1. **SyncHook (同期フック)**:
   - 登録された関数を順番に実行します。戻り値は無視されます。
2. **AsyncSeriesHook (非同期直列フック)**:
   - Promiseを返す非同期関数を順番に実行し、一つが終わるのを待ってから次を実行します。
3. **AsyncSeriesWaterfallHook (非同期直列ウォーターフォールフック)**:
   - 前の関数の戻り値（Promiseの解決値）を次の関数の引数として渡していきます。最終的な加工結果を取得するのに適しています。

### 基本的なAPI設計（例）
```javascript
const hook = new AsyncSeriesWaterfallHook(["data"]);

// プラグインの登録
hook.tapPromise("LoggerPlugin", async (data) => {
  console.log("Input:", data);
  return data;
});

hook.tapPromise("TransformPlugin", async (data) => {
  return data.toUpperCase();
});

// 実行
const result = await hook.promise("hello");
console.log(result); // "HELLO"
```

### 発展課題（余裕があれば）
- **インターセプター**: フックの実行前後に共通の処理（ロギングやメトリクス計測）を挟めるようにする。
- **型安全性**: TypeScriptで実装する場合、引数の型が正しく推論されるように定義する。

### ゴール
- 複数のプラグインが協調して動作し、非同期処理の順序が保証されていること。
- `tap` (同期) や `tapPromise` (非同期) など、登録方法に応じた適切な実行制御ができること。
