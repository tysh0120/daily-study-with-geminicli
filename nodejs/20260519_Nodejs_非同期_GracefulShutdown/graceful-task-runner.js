/*
 【課題：TaskRunnerに「安全な停止」機能を追加しよう】
  昨日の優先度付き TaskRunner
  は非常に実用的ですが、実際の運用（本番サーバーなど）では「プログラムを止めるとき」の挙動が極めて重要になります。

  もし実行中にサーバーを急に止めてしまうと、処理中のデータが中途半端に消えたり、不整合が起きたりする可能性があります。そ
  こで、安全にシステムを閉じるための Graceful Shutdown（優雅な停止） 機能を TaskRunner に実装してみましょう。

  要件：
   1. shutdown() メソッドを追加してください。
   2. shutdown() が呼び出された後は、新たに run() を実行しようとするとエラーを返す（または即座に Reject
      する）ようにしてください。
   3. すでにキューで待機しているタスクは、実行せずに「キャンセルされた」として Reject してください。
   4. 現在実行中のタスクについては、それらがすべて完了するまで shutdown() メソッド自体を await
      できるようにしてください。
   5. （発展）shutdown(timeout)
      のようにタイムアウトを指定でき、一定時間待っても終わらない場合は待つのをやめて終了するようにしてください。

  ベースコード：
  昨日の task-runner-with-priority.js をベースに拡張してください。

    1 // 実装イメージ
    2 const runner = new TaskRunner(2);
    3
    4 // タスクをいくつか投入...
    5 runner.run(task1);
    6 runner.run(task2);
    7 runner.run(task3); // これはキューに入る
    8
    9 // 停止命令
   10 await runner.shutdown(5000); // 5秒待機
   11 console.log("System stopped safely.");
*/

class ShutdownError extends Error {}

class TaskRunner {
  constructor({concurrency=2, retryCount=3} = {}) {
    this.concurrency = concurrency;
    this.retryCount = retryCount;
    this.runningCount = 0;
    this.waitQueue = [];
    this.isShutdown = false;
    this.allFinished = null; // shutdown後、最後の実行中taskから終了通知を受け付けるresolve関数が入る
  }

  async run(task) {
    if (this.isShutdown) {
        throw new ShutdownError('shutdownしたため受け付けられません。');
    }
    if (this.runningCount < this.concurrency) {
        this.runningCount++;
    } else {
      try {
        await new Promise((resolve, reject) => this.waitQueue.push({ resolve, reject }));
      } catch (e) {
        console.error(e);
        return;
      }
    }
    let res;
    for (let retries = 0; retries < this.retryCount; retries++) {
      try {
        if (this.isShutdown) {
          throw new ShutdownError('shutdownが検出されたため実行をキャンセルします');
          break;
        }
        res = await task();
      } catch (e) {
        console.error(e);
        if (e instanceof ShutdownError) {
          break;
        }
        if (retries == this.retryCount - 1) {
          console.log('リトライを規定回数失敗したため結果取得できませんでした');
          break;
        } else {
          await new Promise(resolve => setTimeout(resolve, 1000*(2**retries)));
        }
      }
    }
    if (this.waitQueue.length > 0 && !this.isShutdown) {
      // 実行待ちタスクがあれば実行
      this.waitQueue.shift().resolve();
    } else {
      // なければカウンタをデクリメント(セマフォ解除)
      this.runningCount--;
      // shutdownでセマフォが0の場合、終了通知
      if (this.runningCount == 0 && this.isShutdown) {
        this.allFinished();
      }
    }
    return res;
  }
  
  async shutdown(ms) {
    console.log('shutdownを受け付けました');
    this.isShutdown = true;
    // 実行待ちのworkerをreject
    for (const worker of this.waitQueue) {
      worker.reject(new ShutdownError('shutdownのため実行をキャンセルします'));
    }
    // 実行中のworkerがあれば終了待ち(最大でms)
    if (this.runningCount > 0) {
      console.log('実行中のtaskがあるため終了待ちします');
      const workerWaiter = new Promise(resolve => this.allFinished = resolve);
      await Promise.race([
        new Promise(resolve => setTimeout(resolve, ms)),
        workerWaiter
      ]);
    }
  }
}

// テスト用：実行に時間がかかるダミータスク
const createTask = (id, ms) => async () => {
  console.log(`Task ${id} started (duration: ${ms}ms)`);
  if (Math.random() < 0.3) throw new Error(`Task ${id} サーバでエラー`);
  await new Promise(resolve => setTimeout(resolve, ms));
  console.log(`Task ${id} completed`);
  return `Result of ${id}`;
};

// 実行例（並列数を2に制限）
const runner = new TaskRunner(2);
(async () => {
    try {
        setImmediate(() => runner.run(createTask(1, 2000))
            .then(res => console.log(res))
            .catch(err => console.error(err)));
        setImmediate(() => runner.run(createTask(2, 1000))
            .then(res => console.log(res))
            .catch(err => console.error(err)));
        setImmediate(() => runner.run(createTask(3, 1500))
            .then(res => console.log(res))
            .catch(err => console.error(err)));
        setImmediate(() => runner.run(createTask(4, 500))
            .then(res => console.log(res))
            .catch(err => console.error(err)));
        setTimeout(() => runner.shutdown(), 3000);
        setImmediate(() => runner.run(createTask(5, 1500))
            .then(res => console.log(res))
            .catch(err => console.error(err)));

    } catch (e) {
        console.error(e);
    }
})();

