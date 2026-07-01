export type TaskRecord = {
    name: string,
    startTime?: Date,
    startTaskCount?: number
    endTime?: Date,
    endTaskCount?: number
};

export type TaskHandle<T> = {
    task: () => Promise<T>,
    resolve: (val: T) => void,
    reject: (err: Error) => void,
    promise: Promise<T>
}

/**
 * テスト用タスク作成クラス
 * 実行履歴と稼働数を残すタスクを生成
 */
export class TaskMaker<T> {
    protected _taskRecords: Map<string, TaskRecord>;
    protected _taskCount: number;

    constructor() {
        this._taskRecords = new Map<string, TaskRecord>();
        this._taskCount = 0;
    }

    getTaskRecords() {
        return this._taskRecords;
    }

    getTaskCount() {
        return this._taskCount;
    }

    _setStartRecord(taskRecord: TaskRecord) {
        taskRecord.startTime = new Date();
        taskRecord.startTaskCount = this._taskCount;
    }

    _setEndRecord(taskRecord: TaskRecord) {
        taskRecord.endTime = new Date();
        taskRecord.endTaskCount = this._taskCount;
    }

    makeTask(name: string): TaskHandle<T> {
        const taskRecord: TaskRecord = { name };
        let resolveFunc: (val: T) => void;
        let rejectFunc: (err: unknown) => void;

        const promise = new Promise<T>((resolve, reject) => {
            resolveFunc = resolve;
            rejectFunc = reject;
        });

        return {
            task: () => {
                this._taskCount++;
                this._setStartRecord(taskRecord);
                this._taskRecords.set(name, taskRecord);
                return promise;
            },
            resolve: (val: T) => {
                console.log('resolve called');
                this._taskCount--;
                this._setEndRecord(taskRecord);
                this._taskRecords.set(name, taskRecord);
                resolveFunc(val);
            },
            reject: (err?: unknown) => {
                console.log(`reject called ${err}`);
                this._taskCount--;
                this._setEndRecord(taskRecord);
                this._taskRecords.set(name, taskRecord);
                rejectFunc(err);
            },
            promise
        }
    }
}

