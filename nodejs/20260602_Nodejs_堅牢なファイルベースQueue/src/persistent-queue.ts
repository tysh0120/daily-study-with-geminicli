import * as fs from 'node:fs/promises';

export class QueueEmptyError extends Error {}
export class DuplicateNameError extends Error {}

export class PersistentQueue<T> {
    static allQueueNames: Set<string> = new Set();
    private _queue: T[];
    private _manifestFile: string;
    private _queueFile: string;
    private _spos: number; 

    private constructor(private name: string, private _queueDir: string='./queues') {
        if (PersistentQueue.allQueueNames.has(name)) {
            throw new DuplicateNameError(`${name} は既に使用されてます`);
        }
        PersistentQueue.allQueueNames.add(name);
        this._queue = [];
        this._queueFile = `${this._queueDir}/${this.name}.queue`;
        this._manifestFile = `${this._queueDir}/${this.name}.manifest`
        this._spos = 0;
    }

    static async create(name: string, queueDir='./queues') {
        const persistentQueue = new PersistentQueue(name, queueDir);
        await persistentQueue.recovery();
        return persistentQueue;
    }

    async enqueue(value: T): Promise<void> {
        const jsonValue = JSON.stringify(value) + '\n';
        await fs.writeFile(this._queueFile, jsonValue, { flag: 'a' });
        // ファイル書き込みに成功したらメモリの状態も合わせる
        this._queue.push(value);
    }
   
    async dequeue(): Promise<T> {
        if (this._queue.length == 0) {
            throw new QueueEmptyError('キューが空です');
        }

        let spos = this._spos + this.lengthInQueueFile(this.peek()!);
        await fs.writeFile(this._manifestFile, spos.toString());
        // ファイル書き込みに成功したらメモリの状態も合わせる
        this._spos = spos;
        return this._queue.shift()!;
    }

    peek(): T | undefined {
        return this._queue[0];
    }

    size(): number {
        return this._queue.length;
    }
    
    async recovery(): Promise<void> {
        // キュー管理用ディレクトリ作成(あればそのまま利用）
        await fs.mkdir(this._queueDir, {recursive: true});
    
        // _queue, _spos　はファイルから読み直すため初期化
        this._queue = [];
        this._spos = 0;
        try {
            const jsonValues = await fs.readFile(this._queueFile, 'utf-8');
            this._spos = parseInt(await fs.readFile(this._manifestFile, 'utf-8'));
            for (const jsonVal of jsonValues.slice(this._spos).split("\n")) {
                // 末尾に空要素がくる
                if (jsonVal == '') {
                    continue;
                }
                this._queue.push(JSON.parse(jsonVal));
            }
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
    
    private lengthInQueueFile(obj: T) {
        // JSON文字列長 + １（改行分）増やす
        return JSON.stringify(obj).length + 1;
    }

}

