 /*
  1. 【今日のテーマ】
  非同期処理の優先度制御（Priority Queue）

  2. 【課題：優先度付きタスクランナーへ進化させよう】
  昨日の TaskRunner
  は、追加された順番に実行される「FIFO（先入れ先出し）」形式でした。しかし実戦では、「ユーザーの操作への応答（高優先度）
  」と「バックグラウンドのログ保存（低優先度）」が混在する場合、重要なものを先に処理する必要があります。

  既存の TaskRunner を拡張して、以下の要件を満たすクラスを作成してください。

  要件：
   1. run(task, priority) メソッドで、タスクと一緒に優先度（数値）を指定できるようにする。
      - デフォルトの優先度は 0 とし、数値が大きいほど優先度が高い（先に実行される）ものとします。
   2. 同時実行枠が空いたとき、待機しているタスクの中から 「最も優先度の高いもの」 を次に実行すること。
   3. 同じ優先度のタスクが複数待機している場合は、追加されたのが早い順（FIFO）に実行すること。
   4. 制約: 昨日の「resolve をキューに入れて await する」というエレガントな仕組みを維持したまま実装してみてください。

  ベースコードのイメージ：

   1 const runner = new TaskRunner(2); // 同時実行数は2
   2
   3 runner.run(createTask('Low', 1000), 0);  // 優先度0（低）
   4 runner.run(createTask('Mid', 1000), 5);  // 優先度5（中）
   5 runner.run(createTask('High', 1000), 10); // 優先度10（高）
   6
   7 // 実行枠が2つの場合、LowとMidが先に開始されますが、
   8 // どちらかが終わった後に次に呼ばれるのは、Lowより後に追加されたHighであるべきです。

*/

const createTask = (id, period, rate = 0) => {
    return async () => {
        try {
            console.log(`${id} started`);
            await new Promise((resolve, reject) => setTimeout(Math.random() < rate ? reject : resolve, period));
            console.log(`${id} successed`);
            return `${id} success`;
        } catch (e) {
            console.error('Server Error!');
            throw e;
        }
    }
}

class TaskRunner {
    constructor(concurrency) {
        this.concurrency = concurrency;
        this.runnings = 0;
        this.queues = {};
        this.priorities = [];
    }

    enqueue(priority, task) {
        if (!(priority in this.queues)) {
            this.queues[priority] = [];
            this.priorities = Object.keys(this.queues).sort((x, y) => y - x);
        }
        this.queues[priority].push(task);
    }

    dequeue() {
        for (const priority of this.priorities) {
            const el = this.queues[priority].shift();
            if (el) return el;
        }
    }

    next() {
        const nextEl = this.dequeue();
        if (nextEl) nextEl();
    }

    async run(task, priority) {
        while (true) {
            if (this.runnings == this.concurrency) {
                await new Promise(resolve => {
                    this.enqueue(priority, resolve);
                });
            }
            try {
                this.runnings++;
                return await task();
            } catch (e) {
                console.error("エラー発生", e)
            } finally {
                this.runnings--;
                this.next();
            }
        }
    }
}

(async () => {
    const runner = new TaskRunner(2);
    await Promise.all(
        [...new Array(10)].map(_ => {
            const idx = Math.floor(3*Math.random());
            return runner.run(createTask(['Low', 'Mid', 'High'][idx],
                                         2000*Math.random(),
                                         0.3),
                              [0, 5, 10][idx])
        })
    )
        .then(res => console.log(res))
        .catch(err => console.error(err))
})();


