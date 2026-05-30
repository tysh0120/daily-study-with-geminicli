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

