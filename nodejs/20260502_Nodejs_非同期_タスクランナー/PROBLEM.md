1. 【今日のテーマ】
  非同期処理の並列数制御（セマフォの応用）

  2. 【課題：同時実行制限付きタスクランナーを作ろう】
  実務では、1,000個の画像をリサイズしたり、外部APIへ大量のリクエストを送ったりする場面があります。これを Promise.all
  で一気に行うと、メモリ不足（OOM）や接続先のレート制限に抵触してしまいます。

  そこで、実行できるタスクの「同時並列数」を制限できる TaskRunner クラスを作成してください。

  要件：
   1. クラスのコンストラクタで最大並列数（concurrency）を指定できる。
   2. run(task) メソッドでタスク（Promiseを返す関数）を追加する。
   3. 重要： run メソッドの戻り値は、そのタスクが「実際に完了した際」の結果を返す Promise であること。
   4. 同時実行数が concurrency に達している場合、既存のタスクが完了するまで新しいタスクの開始を待機させること。

  ベースコード：

    1 class TaskRunner {
    2   constructor(concurrency) {
    3     this.concurrency = concurrency;
    4     // ここに実装を追加
    5   }
    6
    7   async run(task) {
    8     // ここに実装を追加
    9   }
   10 }
   11
   12 // テスト用：実行に時間がかかるダミータスク
   13 const createTask = (id, ms) => async () => {
   14   console.log(`Task ${id} started (duration: ${ms}ms)`);
   15   await new Promise(resolve => setTimeout(resolve, ms));
   16   console.log(`Task ${id} completed`);
   17   return `Result of ${id}`;
   18 };
   19
   20 // 実行例（並列数を2に制限）
   21 const runner = new TaskRunner(2);
   22
   23 // 一気に5つのタスクを投入しても、同時に動くのは2つだけにする
   24 Promise.all([
   25   runner.run(createTask(1, 2000)),
   26   runner.run(createTask(2, 1000)),
   27   runner.run(createTask(3, 1500)),
   28   runner.run(createTask(4, 500)),
   29   runner.run(createTask(5, 1000))
   30 ]).then(results => {
   31   console.log('All results:', results);
   32 });
