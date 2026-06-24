type QueueEntry = {
    resolve: any,
    reject: any
}

export class RateLimitter {
    private queue: QueueEntry[] = [];
    private counter: number = 0;
    private _limit: number;
    private _interval: number;

    /**
     * @param: limit: 期間実行上限
     * @param: interval: 期間
     */
    constructor({ limit, interval }:
                { limit: number, interval: number }) {
        this._limit = limit;
        this._interval = interval;
    }

    /**
     * タスクを指定されたlimit、intervalで実行制御する
     * @param: task: タスク
     */
    public async run(task: any) {
        if (this.counter < this._limit) {
            this.counter++;
            console.log(`counter: ${this.counter}`);
        } else {
            // 実行枠いっぱいならqueueに登録して待ち
            await new Promise((resolve, reject) => {
                this.queue.push({ resolve, reject });
            });
        }
        // _interval時間後に、queueに入っていればresolveする処理を予約
        let hasQueueResolved = false;
        let counterHandle = setTimeout(() => {
            hasQueueResolved = this.resolveQueue();
        }, this._interval)

        // task実行
        const result = await task();
        if (!hasQueueResolved) {
            clearTimeout(counterHandle);
            // 実行待ちのタスクがない場合、カウンターを減らす
            if (!this.resolveQueue()) {
                this.counter--;
                console.log(`counter: ${this.counter}`);
            }
        }
        return result;
    }

    protected resolveQueue(): boolean {
        const entry = this.queue.shift();
        if (entry) {
            entry.resolve();
            return true;
        }
        return false;
    }
}

