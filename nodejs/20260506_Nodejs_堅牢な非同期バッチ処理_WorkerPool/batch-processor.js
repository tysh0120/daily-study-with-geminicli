/*
【今日のテーマ】
  Node.js：堅牢な「非同期バッチプロセッサ」の実装

  【課題：高度なリトライ機能付きバッチプロセッサを作ってみよう】
  大量のタスク（APIリクエストやデータ変換など）を、システム負荷を抑えつつ「確実に」完遂させるためのクラス BatchProcessor
  を実装してください。

  具体的な要件：
   1. 並列実行数の制御 (Concurrency): システムの負荷を抑えるため、同時に実行される非同期タスクの最大数を制限できること。
   2. バッチ処理:
      一定数（例：10個）のタスクを1つの「バッチ」として扱い、そのバッチ内の全タスクが完了（成功または最大リトライ到達）
      してから次のバッチへ進む仕組み。
   3. 指数バックオフ・リトライ: 特定のタスクが失敗した際、即座にリトライするのではなく、待ち時間を指数関数的（1s, 2s,
      4s...）に増やしながら、指定回数まで再試行すること。
   4. イベント駆動: EventEmitter を継承し、各タスクの taskSuccess, taskFailure, taskRetry
      などのイベントをリアルタイムで発行すること。
   5. 詳細なレポート:
      全ての処理が終了した際、成功数・最終的な失敗数・リトライの総計を含むレポートオブジェクトを返却すること。
*/
import { EventEmitter } from 'events';

const createTask = (id, timeout=1000, errRate=0.3) => () => {
    return new Promise((res, rej) => {
        console.log(`${id} started`);
        setTimeout(() => {
            if (Math.random() < errRate) rej(`${id} Server Error`);
            res(`${id} success`);
        }, timeout);
    });
}

class BatchProcessor extends EventEmitter {
    constructor({ concurrency=2, batchSize=10, retryCount=3 } = {}) {
        super();
        this.concurrency = concurrency;
        this.batchSize = batchSize;
        this.retryCount = retryCount;
        this.stats = {
            success: 0,
            errors: 0,
            retries: 0,
        };

        this.on('taskSuccess', this.onTaskSuccess);
        this.on('taskError', this.onTaskError);
        this.on('taskRetry', this.onTaskRetry);
    }

    onTaskSuccess() {
        this.stats.success++;
    }

    onTaskError() {
        this.stats.errors++;
    }

    onTaskRetry() {
        this.stats.retries++;
    }

    report() {
        console.log(`Report: \nsuccess: ${this.stats.success}\nerrors: ${this.stats.errors}\nretries: ${this.stats.retries}`);
    }

    async run(task) {
        for (let retries = 0; retries < this.retryCount; retries++) {
            try {
                const result = await task();
                this.emit('taskSuccess');
                return result;
            } catch (e) {
                if (retries == this.retryCount - 1) {
                    this.emit('taskError');
                    throw e;
                }
                this.emit('taskRetry');
                await new Promise(res => setTimeout(res, 1000 * (2**retries)));
            }
        }
    }

    async execBatch(batchTasks) {
        let curIdx = 0;
        const res = [];
        const workers = Array(this.concurrency).fill(null).map(async () => {
            while (curIdx < batchTasks.length) {
                const idx = curIdx++;
                try {
                    res[idx] = await this.run(batchTasks[idx]);
                } catch (e) {
                    console.log(e);
                    res[idx] = e;
                }
            }
        });
 
        await Promise.allSettled(workers);
        return res;
    }

    async exec(tasks) {
        let results = [];
        for (let i = 0; i < tasks.length / this.batchSize; i++) {
            console.log(i, i * this.batchSize, (i+1) * this.batchSize);
            results = [...results, ...await this.execBatch(tasks.slice(i * this.batchSize, (i+1) * this.batchSize))];
        }
        return results;
    }
}

const processor = new BatchProcessor();
console.log(await processor.exec([...new Array(20)].map((_, i) => createTask(`task${i}`))));
processor.report();

