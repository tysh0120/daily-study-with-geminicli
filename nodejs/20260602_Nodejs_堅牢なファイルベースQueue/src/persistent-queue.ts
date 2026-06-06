import * as fs from 'node:fs/promises';

export class QueueEmptyError extends Error {}
export class DuplicateNameError extends Error {}

export class PersistentQueue<T> {
    static allQueueNames: Set<string> = new Set();
    private _queue: T[];
    private _manifestFile: string;
    private _queueFile: string;
    private _spos: number; 
    private _epos: number;

    private constructor(private name: string, private _queueDir: string='./queues') {
        if (PersistentQueue.allQueueNames.has(name)) {
            throw new DuplicateNameError(`${name} は既に使用されてます`);
        }
        PersistentQueue.allQueueNames.add(name);
        this._queue = [];
        this._queueFile = `${this._queueDir}/${this.name}.queue`;
        this._manifestFile = `${this._queueDir}/${this.name}.manifest`;
        [this._spos, this._epos] = [0, 0];
    }

    static async create(name: string, queueDir='./queues') {
        const persistentQueue = new PersistentQueue(name, queueDir);
        await persistentQueue.recovery();
        return persistentQueue;
    }

    async enqueue(value: T): Promise<void> {
        let handle;
        try {
            handle = await fs.open(this._queueFile, 'a');
            const line = this.toQueueFileEntry(value);
            await handle.writeFile(line);
            await handle.sync();
            let epos= this._epos + line.length;
            await this.writeManifest(this._spos, epos);
            // ファイル書き込みに成功したらメモリの状態も合わせる
            this._epos = epos;
            this._queue.push(value);
        } finally {
            handle?.close();
        }
    }
   
    async dequeue(): Promise<T> {
        if (this._queue.length == 0) {
            throw new QueueEmptyError('キューが空です');
        }

        const firstElement = this.peek()!;
        const spos = this._spos + this.toQueueFileEntry(firstElement).length;
        await this.writeManifest(spos, this._epos);
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
    
        // _queue, _spos　はファイルから読んだ値で初期化
        try {
            [this._spos, this._epos] = await this.readManifest();
            await this.loadFromQueueFile();
        } catch (e: unknown) {
            if (e instanceof Object && 'code' in e && e.code == 'ENOENT') {
                this._queue = [];
                [this._spos, this._epos] = [0, 0];
                // キューファイルがない場合、変数の初期化のみ行う
                // (ファイルはenqueue, dequeue時に作成される)
                return;
            } else {
                throw e;
            }
        }
    }

    clear() {
        this._queue = [];
        [this._spos, this._epos] = [0, 0];
    }

    private toQueueFileEntry(obj: T) {
        // JSON文字列長 + １（改行分）増やす
        return JSON.stringify(obj) + '\n';
    }

    // manifestをatomicに更新
    private async writeManifest(spos: number, epos: number) {
        let handle;
        try {
            handle = await fs.open(this._manifestFile + '.tmp', 'w');
            await handle.writeFile(JSON.stringify([spos, epos]));
            await handle.sync();
        } finally {
            handle?.close();
        }
        await fs.rename(this._manifestFile + '.tmp', this._manifestFile);
    }

    // manifestからデータ読み込み
    private async readManifest() {
        const content = await fs.readFile(this._manifestFile, { encoding: 'utf-8' });
        return JSON.parse(content);
    }

    private async loadFromQueueFile() {
        let handle;
        let stream;
        try {
            handle = await fs.open(this._queueFile, 'r');
            stream = handle.createReadStream({
                start: this._spos,
                end: this._epos
            });
           
            let data = '';
            try {
                for await (const chunk of stream) {

                    data += chunk;
                    // 読み込み完了した行はその場でパースして読み込む
                    const lines = data.split("\n");
                    if (lines.length <= 1) {
                        return;
                    }
                    for (const line of lines.slice(0, lines.length - 1)) {
                        this._queue.push(JSON.parse(line));
                    }
                }
            } catch (e) {
                console.log('エラー発生');
                console.error(e);
            }
        } finally {
            stream?.close();
            handle?.close();
        }
    }
}

