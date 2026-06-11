import * as fs from 'node:fs/promises';
import { finished, pipeline } from 'node:stream/promises';

export class QueueEmptyError extends Error {}
export class DuplicateNameError extends Error {}
export class InvalidFormatError extends Error {}

type PersistentQueueIOOptions = {
    readHighWaterMark?: number,
    writeHighWaterMark?: number
};

export class PersistentQueue<T> {

    static allQueueNames: Set<string> = new Set();
    private _queue: string[];
    private _manifestFile: string;
    private _queueFile: string;
    private _spos: number; 
    private _epos: number;
    
    /**
     * @private
     * @param {string} name
     * @param {string _queueDir
     * @param {PersistentQueueIOOptions} ioOptions 読み書き時のhigiWaterMarkを設定
     */
    private constructor(private name: string,
                        private _queueDir: string='./queues',
                        private ioOptions?: PersistentQueueIOOptions) {
        if (PersistentQueue.allQueueNames.has(name)) {
            throw new DuplicateNameError(`${name} は既に使用されてます`);
        }
        PersistentQueue.allQueueNames.add(name);
        this._queue = [];
        this._queueFile = `${this._queueDir}/${this.name}.queue`;
        this._manifestFile = `${this._queueDir}/${this.name}.manifest`;
        [this._spos, this._epos] = [0, 0];
    }

    /**
     * ファクトリメソッド
     * @param {string} name
     * @param {string} queueDir キューを作成するディレクトリを指定
     * @param {PersistentQueueIOOption} ioOptions 読み書き時のhigiWaterMarkを設定
     */
    static async create<T>(name: string,
                           queueDir='./queues',
                           ioOptions?: PersistentQueueIOOptions) {
        const persistentQueue = new PersistentQueue<T>(name, queueDir, ioOptions);
        await persistentQueue.recovery();
        return persistentQueue;
    }

    /**
     * close 
     * 現在の名称を解放して他のインスタンスで使用できるようにする
     */
    close() {
        PersistentQueue.allQueueNames.delete(this.name);
    }
   
    /**
     * enqueue
     * @param {T} value
     */
    async enqueue(value: T): Promise<void> {
        let epos = this._epos;
        await using handle = await fs.open(this._queueFile, 'a');
        try {
            const line = JSON.stringify(value);
            await handle.writeFile(line + "\n");
            await handle.sync();
            epos = epos + Buffer.byteLength(line + "\n");
            await this.writeManifest(this._spos, epos);
            this._epos = epos;
            this._queue.push(line);
        } catch {
            await handle.truncate(this._epos);
        }
    }
   
    /**
     * dequeue
     * @returns {T}
     */
    async dequeue(): Promise<T> {
        if (this._queue.length == 0) {
            throw new QueueEmptyError('キューが空です');
        }

        const firstElement = this._queue[0];
        const spos = this._spos + Buffer.byteLength(firstElement + "\n");
        try {
            // at least once まずは返却値のみ決定　メモリからはまだ削除しない
            return this.peek()!;
        } finally {
            await this.writeManifest(spos, this._epos);
            // ファイル書き込みに成功したらメモリの状態も合わせる
            this._spos = spos;
            // 最後にメモリから削除
            this._queue.shift();
        }
    }

    /**
     * 先頭要素を返却
     * @returns {T}
     */
    peek(): T | undefined {
        const elmJson = this._queue[0];
        return elmJson && JSON.parse(elmJson);
    }

    /**
     * サイズ
     * @returns {number}
     */
    size(): number {
        return this._queue.length;
    }
    
    /**
     * ファイルより前回終了時の状態復帰
     */
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

    /**
     * キューの内容をクリア
     */
    async clear() {
        await this.writeManifest(0, 0);
        await fs.writeFile(this._queueFile, '');
        [this._spos, this._epos] = [0, 0];
        this._queue = [];
    }

    /**
     * キューファイルとマニフェストの最適化
     */
    async purge() {
        const tmpQueueFileName = this._queueFile + '.tmp';
        {
            if (this._epos == this._spos) {
                await this.clear();
                return;
            }
            // sposからeposまでの内容をいったんtmpファイルに書き出して上書きリネーム
            await using queueHandle = await fs.open(this._queueFile);
            await using tmpQueueHandle = await fs.open(tmpQueueFileName, 'w');
            await using queueStream = queueHandle.createReadStream({
                start: this._spos,
                end: this._epos-1,
                encoding: 'utf-8',
                highWaterMark: this.ioOptions?.readHighWaterMark
            });
            await using tmpQueueStream = tmpQueueHandle.createWriteStream({
                highWaterMark: this.ioOptions?.writeHighWaterMark,
            });
            
            try {
                await pipeline(queueStream, tmpQueueStream);
            } catch (e) {
                console.error(`エラー発生 ${e}`);
                throw e;
            }
        }

        await fs.rename(tmpQueueFileName, this._queueFile);
        // manifestファイルの更新
        await this.writeManifest(0, this._epos - this._spos);
        // メモリの更新
        [this._spos, this._epos] = [0, this._epos - this._spos];
    }

    /**
     * キューファイルの要素(改行区切りJSON)に変換
     * @param {T} obj
     */
    private toQueueFileEntry(obj: T) {
        // JSON文字列長 + １（改行分）増やす
        return JSON.stringify(obj) + '\n';
    }

    /**
     * マニフェストファイルに書き込み
     * @param {number} spos 開始位置
     * @param {number} epos 終了位置
     */
    private async writeManifest(spos: number, epos: number) {
        let handle;
        try {
            handle = await fs.open(this._manifestFile + '.tmp', 'w');
            await handle.writeFile(JSON.stringify([spos, epos]));
            await handle.sync();
        } finally {
            await handle?.close();
        }
        await fs.rename(this._manifestFile + '.tmp', this._manifestFile);
    }

    /**
     * manifestからデータ読み込み
     * @returns {Promise<number[]>} manifest
     */
    private async readManifest(): Promise<[number, number]> {
        const content = await fs.readFile(this._manifestFile, { encoding: 'utf-8' });
        const parsed = JSON.parse(content);
        if (!
            (
                parsed instanceof Array && parsed.length == 2 &&
                typeof parsed[0] == 'number' && typeof parsed[1] == 'number'
            )
        ) {
            throw new InvalidFormatError(this._manifestFile);
        }
        return parsed as [number, number];
    }

    private async loadFromQueueFile() {
        let handle;
        let stream;
        try {
            handle = await fs.open(this._queueFile, 'r');
            stream = handle.createReadStream({
                start: this._spos,
                end: this._epos-1,
                encoding: 'utf-8',
                highWaterMark: this.ioOptions?.readHighWaterMark,
            });
            let data = '';
            try {
                for await (const chunk of stream) {
                    data += chunk;
                    const lines = data.split("\n");
                    // 最後の行は次回に持ち越し (最終のchunkは改行で終わるため、最終行は処理不要)
                    data = lines.pop()!;
                    // JSONが完成した行はその場で
                    for (const line of lines) {
                        this._queue.push(line);
                    }
                }
            } catch (e) {
                console.log('エラー発生');
                console.error(e);
            }
        } finally {
            stream?.close();
            await handle?.close();
        }
    }
}

