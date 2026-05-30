1. 【今日のテーマ】
  サーキットブレーカー（Circuit Breaker）パターン

  2. 【課題：壊れかけのサービスを保護せよ】
  不安定な外部APIに対して、単にリトライを繰り返すだけでは、相手の負荷をさらに高めてしまったり（二次災害）、こちらの処理
  が長時間ブロックされたりするリスクがあります。

  そこで、以下の要件を満たす CircuitBreaker クラスを実装してください。

  【要件】
   1. 3つの状態を持つこと
      - CLOSED: 通常状態。タスクを実行し、失敗をカウントする。
      - OPEN: 遮断状態。タスクを実行せず、即座にエラー（「Service Unavailable」など）を返す。
      - HALF_OPEN: 試行状態。一定時間経過後に、一度だけタスクを実行して復旧を確認する。

   2. 状態遷移のルール
      - CLOSED → OPEN: タスクが連続で N 回（例: 3回）失敗したら、状態を OPEN にし、タイマーを開始する。
      - OPEN → HALF_OPEN: OPEN になってから T 秒（例: 5秒）経過したら、自動的（または次の呼び出し時）に HALF_OPEN
        に遷移する。
      - HALF_OPEN → CLOSED: HALF_OPEN での試行が成功したら、失敗カウントをリセットして CLOSED に戻る。
      - HALF_OPEN → OPEN: HALF_OPEN での試行が失敗したら、再度 OPEN に戻り、タイマーをリセットする。

   3. インターフェース
      - const breaker = new CircuitBreaker(task, { failureThreshold: 3, resetTimeout: 5000 })
      - breaker.call() メソッドでラップされたタスクを実行する。
