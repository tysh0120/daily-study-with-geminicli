1. 【今日のテーマ】
  Node.js: AsyncLocalStorage を活用した非同期実行コンテキストの管理

  2. 【課題：リクエスト追跡ロガーを作ってみよう】
  複雑なアプリケーションでは、ログの中に「どのリクエストに由来する処理か」を示す Trace ID を含めることが重要です。しかし、すべての関数の引数に
  traceId を追加して回るのは、コードの可読性を著しく下げます（いわゆる「引数のバケツリレー」）。

  この課題では、AsyncLocalStorage を使って、引数で渡すことなく深層の関数まで Trace ID を自動で伝搬させる仕組みを実装してください。

  【具体的な要件】
   1. node:async_hooks の AsyncLocalStorage を使用してください。
   2. 擬似的なリクエストハンドラを実装してください（HTTP サーバーでなくても、関数呼び出しでシミュレートできれば OK です）。
   3. 共通ロガー (logger.log) を作成してください。この関数は引数にメッセージのみを受け取りますが、出力時には「現在実行中の Trace
      ID」が自動で付加されるようにしてください。
   4. 非同期処理の壁を越える確認: setTimeout や Promise.resolve().then() などの非同期処理を挟んだ先にある関数（Service 層や DB
      層を模したもの）でも、正しく同じ Trace ID が取得できることを実証してください。

  【期待される出力イメージ】

   1 [TraceID: req-101] Service layer started.
   2 [TraceID: req-102] Service layer started.
   3 [TraceID: req-101] Database saved (after 100ms).
   4 [TraceID: req-102] Database saved (after 50ms).
