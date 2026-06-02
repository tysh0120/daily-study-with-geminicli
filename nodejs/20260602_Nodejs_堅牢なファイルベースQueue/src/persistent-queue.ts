import * as fs from 'node:fs/promises';

export class PersistentQueue {
    _queue: any[];
    _tmpFile: string;
    _queueFile: string;
    constructor(private name: string) {
        this._queue = [];
        this._tmpFile = `./queues/${this.name}.tmp`;
        this._queueFile = `./queues/${this.name}.queue`;
    }

    async writeQueueFile(value: any): Promise<void> {
        await fs.writeFile(this._tmpFile, value);
        await fs.rename(this._tmpFile, this._queueFile);
    }

    async enqueue(value: any): Promise<void> {
        await this.writeQueueFile(JSON.stringify([...this._queue, value]));
        // ファイル書き込みに成功したらメモリの状態も合わせる
        this._queue.push(value);
    }

    async dequeue(): Promise<any> {
        await this.writeQueueFile(JSON.stringify(this._queue.slice(1)));
        return this._queue.shift();
    }

    peek(): any {
        return this._queue[0];
    }

    size(): number {
        return this._queue.length;
    }

    async recovery(): Promise<void> {
        const queueAsJson = await fs.readFile(this._queueFile, 'utf-8') as string;
        this._queue = JSON.parse(queueAsJson);
    }
}

