1. 【今日のテーマ】
  リトライ機構とタイムアウト（実戦的な非同期処理の制御）

  2. 【課題：不安定なAPI通信を攻略しよう】
  実務では、通信環境が悪かったり、サーバーが一時的に過負荷だったりすることがあります。そこで、以下の要件を満たす
  fetchWithRetry 関数を作成してください。

  要件：
   1. タイムアウト機能: 指定した時間（例: 2000ms）以内にレスポンスがない場合は、エラーを投げる。
   2. リトライ機能: エラーが発生した場合、指定した回数（例: 最大3回）まで再試行する。
   3. バックオフ:（オプション）リトライするたびに、待ち時間を少しずつ長くする。

 ベースコード:

    1 // 30%の確率で成功し、それ以外は1.5秒かかる、あるいは失敗する不安定な関数
    2 const unstableApiCall = async () => {
    3     const rand = Math.random();
    4     await new Promise(res => setTimeout(res, rand * 2000));
    5     if (rand < 0.3) return "Success!";
    6     throw new Error("Server Error");
    7 };
    8
    9 const fetchWithRetry = async (task, options) => {
   10     // ここに実装してください
   11 };
   12
   13 // 実行例
   14 fetchWithRetry(unstableApiCall, { retries: 3, timeout: 1000 })
   15     .then(console.log)
   16     .catch(console.error);
