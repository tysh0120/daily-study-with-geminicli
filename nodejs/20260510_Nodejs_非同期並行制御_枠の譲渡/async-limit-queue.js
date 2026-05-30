  /*
  【今日のテーマ：非同期タスクの流量制限】

  大量の非同期タスク（APIリクエストなど）を一度に実行すると、接続先のサーバーに負荷をかけすぎたり、メモリを圧迫したりす
  ることがあります。
  そこで、「同時に実行できるタスク数を最大 $N$ 個に制限しながら、タスクを順番に処理するキュー」を実装してみましょう。

  【課題：並行実行制限付きタスクランナー AsyncLimitQueue を作ろう】

  以下の要件を満たすクラス AsyncLimitQueue を作成してください。

   1. コンストラクタ: 同時実行数 limit を引数に取ります。
   2. push(task) メソッド:
       - task は「Promiseを返す関数」です。
       - このメソッド自体もPromiseを返し、そのタスクが完了したタイミングで解決（resolve）されるようにしてください。
   3. 動作ルール:
       - 現在実行中のタスクが limit 未満なら、即座に実行を開始します。
       - limit に達している場合は、実行中のいずれかのタスクが完了するまで待機（キューイング）します。
       - タスクが完了したら、待機中のタスクがあれば一つ取り出して実行を開始します。

  使用イメージ

    1 const queue = new AsyncLimitQueue(2); // 同時実行数は2
    2
    3 const task = (id, ms) => async () => {
    4   console.log(`Task ${id} started`);
    5   await new Promise(resolve => setTimeout(resolve, ms));
    6   console.log(`Task ${id} finished`);
    7   return id;
    8 };
    9
   10 // 3つのタスクを投入（最初の2つが即座に動き、3つ目はどちらかが終わるまで待機）
   11 queue.push(task(1, 1000)).then(res => console.log(`result: ${res}`));
   12 queue.push(task(2, 500)).then(res => console.log(`result: ${res}`));
   13 queue.push(task(3, 300)).then(res => console.log(`result: ${res}`));
*/
import { EventEmitter } from 'events';

const task = (id, ms) => async () => {
    console.log(`Task ${id} started`);
    await new Promise(resolve => setTimeout(resolve, ms));
    console.log(`Task ${id} finished`);
    return id;
};

class AsyncLimitQueue {
    constructor(limit) {
        this.limit = limit;
        this.counter = 0;
        this.queue = [];
    }

    async push(task) {
        if (this.counter == this.limit) {
            await new Promise(forResolved => this.queue.push(forResolved));
        } else {
            this.counter++;
        }
        try {
            return await task();
        } finally {
            const nextResolve = this.queue.shift();
            if (nextResolve) {
                nextResolve();
             } else {
                this.counter--;
             }
        }
    }
}

const queue = new AsyncLimitQueue(2);

queue.push(task(1, 1000)).then(res => console.log(`result: ${res}`));
queue.push(task(2, 500)).then(res => console.log(`result: ${res}`));
queue.push(task(3, 300)).then(res => console.log(`result: ${res}`));

