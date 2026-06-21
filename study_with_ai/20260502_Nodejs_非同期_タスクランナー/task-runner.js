class TaskRunner {
  constructor(concurrency) {
    this.concurrency = concurrency;
    this.running_count = 0;
    this.resolve_queue = [];
  }

  async run(task) {
    if (this.running_count == this.concurrency) {
      await new Promise(res => this.resolve_queue.push(res));
    }
    let res;
    try {
      this.running_count++;
      console.log(this.running_count);
      res = await task();
    } catch (e) {
      console.log(`エラー発生 ${e}`);
      return this.run(task);
    } finally {
      this.running_count--;
      console.log(this.running_count);
    }
    
    if (this.resolve_queue.length > 0) this.resolve_queue.shift()();
    return res;
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

// 一気に5つのタスクを投入しても、同時に動くのは2つだけにする
Promise.all([
  runner.run(createTask(1, 2000)),
  runner.run(createTask(2, 1000)),
  runner.run(createTask(3, 1500)),
  runner.run(createTask(4, 500)),
  runner.run(createTask(5, 1000))
]).then(results => {
  console.log('All results:', results);
});

