import * as fs from 'node:fs/promises';

export class QueueEmptyError extends Error {}
export class DuplicateNameError extends Error {}

export class PersistentQueue<T> {
    static allQueueNames: Set<string> = new Set();
    private _queue: T[];
    private _tmpFile: string;
    private _queueFile: string;
    
    private constructor(private name: string, private _queueDir: string='./queues') {
        if (PersistentQueue.allQueueNames.has(name)) {
            throw new DuplicateNameError(`${name} は既に使用されてます`);
        }
        PersistentQueue.allQueueNames.add(name);
        this._queue = [];
        this._tmpFile = `${this._queueDir}/${this.name}.tmp`;
        this._queueFile = `${this._queueDir}/${this.name}.queue`;
    }

    static async create(name: string, queueDir='./queues') {
        const persistentQueue = new PersistentQueue(name, queueDir);
        await persistentQueue.recovery();
        return persistentQueue;
    }

    async writeQueueFile(data: T[]): Promise<void> {
        await fs.writeFile(this._tmpFile, JSON.stringify(data));
        await fs.rename(this._tmpFile, this._queueFile);
    }

    async enqueue(value: T): Promise<void> {
        await this.writeQueueFile([...this._queue, value]);
        // ファイル書き込みに成功したらメモリの状態も合わせる
        this._queue.push(value);
    }

    async dequeue(): Promise<T> {
        if (this._queue.length == 0) {
            throw new QueueEmptyError('キューが空です');
        }
        await this.writeQueueFile(this._queue.slice(1));
        // ファイル書き込みに成功したらメモリの状態も合わせる
        return this._queue.shift()!;
    }

    peek(): T | undefined {
        return this._queue[0];
    }

    size(): number {
        return this._queue.length;
    }
    
    async recovery(): Promise<void> {
        await fs.mkdir(this._queueDir, {recursive: true});
        try {
            const queueAsJson = await fs.readFile(this._queueFile, 'utf-8')
            this._queue = JSON.parse(queueAsJson);
        } catch (e: unknown) {
            if (e instanceof Object && 'code' in e && e.code == 'ENOENT') {
                // キューファイルがない場合、何もしない
                // (ファイルはenqueue, dequeue時に作成される)
                return;
            } else {
                throw e;
            }
        }
    }
}

