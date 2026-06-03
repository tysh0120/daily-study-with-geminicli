import * as fs from 'node:fs/promises';

export class QueueEmptyError extends Error {}
export class DuplicateNameError extends Error {}
export class PersistentQueue<T> {
    static allQueueNames: Set<string> = new Set();
    _queue: T[];
    _tmpFile: string;
    _queueFile: string;
    _queueDir: string;
    constructor(private name: string, queueDir: string='./queues') {
        if (PersistentQueue.allQueueNames.has(name)) {
            throw new DuplicateNameError(`${name} は既に使用されてます`);
        }
        PersistentQueue.allQueueNames.add(name);
        this._queue = [];
        this._tmpFile = `${queueDir}/${this.name}.tmp`;
        this._queueDir = queueDir;
        this._queueFile = `${this._queueDir}/${this.name}.queue`;
    }

    create(name, queueDir='./queues') {
        const persistentQueue = new PersistentQueue(name, queueDir);
        persistentQueue.recovery();
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
        return this._queue.shift();
    }

    peek(): any {
        return this._queue[0];
    }

    size(): number {
        return this._queue.length;
    }
    
    async recovery(): Promise<void> {
        try {
            await fs.access(this._queueDir);
        } catch (e: unknown) {
            if (e instanceof Error && (e as any).code == 'ENOENT') {
                await fs.mkdir(this._queueDir);
            }
        }
        try {
            await fs.access(this._queueFile);
            const queueAsJson = await fs.readFile(this._queueFile, 'utf-8') as string;
            this._queue = JSON.parse(queueAsJson);
        } catch {
            // 何もしない
        }
    }
}

