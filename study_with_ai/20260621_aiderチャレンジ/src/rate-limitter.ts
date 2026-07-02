type QueueEntry = {
    resolve: (_?: void) => void,
    reject: (error?: Error) => void
}

export class RateLimitter<T> {
    private _queue: QueueEntry[] = [];
    private _counter: number = 0;
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
    public async run(task: () => Promise<T>): Promise<T> {
        if (this._counter < this._limit) {
            this._counter++;
        } else {
            // 実行枠いっぱいならqueueに登録して待ち
            await new Promise((resolve, reject) => {
                this._queue.push({ resolve, reject });
            });
        }
       
        // 次タスク起動タイマー起動
        setTimeout(() => {
            const entry = this._queue.shift();
            if (entry) {
                entry.resolve();
            } else {
                this._counter--;
            }
        }, this._interval);

        // task実行
        return task();
    }

}

