import { describe, test, expect, beforeEach } from 'vitest';
import { RateLimitter } from './rate-limitter.js';

const startTimes: Date[] = [];
type ExecRecord = { name: string, start?: Date, end?: Date };

/**
 * テスト用タスク作成クラス
 * 実行履歴と稼働数を残すタスクを生成
 */
class TaskMaker {
    protected _execRecords: ExecRecord[];
    protected _taskCounter: number;

    constructor() {
        this._execRecords = [];
        this._taskCounter = 0;
    }

    getExecRecords() {
        return this._execRecords;
    }

    getTaskCounter() {
        return this._taskCounter;
    }

    makeTask(name: string, duration: number, success: boolean=true) {
        return () => new Promise((resolve, reject) => {
            this._taskCounter++;
            const record: ExecRecord = { name, start: new Date() };
            setTimeout(() => {
                record.end = new Date();
                this._execRecords.push(record);
                this._taskCounter--;
                if (success) resolve(`${name } 成功`);
                else reject(`${name} エラー発生`);
            }, duration);
        });
    }
}

async function sleep(ms: number): Promise<void> { 
    await new Promise(resolve => setTimeout(resolve, ms));
}

describe('RateLimitter', () => {
    let rateLimitter: RateLimitter;
    let taskMaker: TaskMaker;

    beforeEach(() => {
        rateLimitter = new RateLimitter({ limit: 2, interval: 100 });
        taskMaker = new TaskMaker();
    });

    test('runは最大実行数までのタスクを起動する', async () => {
        rateLimitter.run(taskMaker.makeTask('task1', 50));
        rateLimitter.run(taskMaker.makeTask('task2', 100));
        rateLimitter.run(taskMaker.makeTask('task3', 50));

        await sleep(10);
        expect(taskMaker.getTaskCounter()).toBe(2);
        await sleep(50);
        expect(taskMaker.getTaskCounter()).toBe(2);
        await sleep(50);
        expect(taskMaker.getExecRecords().length).toBe(3);
        console.log(taskMaker.getExecRecords());
    });

    test('runはタスク開始から規定時間を超えたらまだ終了していなくても最大実行数のタスクを実行する', async () => {
        rateLimitter.run(taskMaker.makeTask('task1', 200));
        rateLimitter.run(taskMaker.makeTask('task2', 200));
        rateLimitter.run(taskMaker.makeTask('task2', 200));

        await sleep(10);
        expect(taskMaker.getTaskCounter()).toBe(2);
        await sleep(100);
        expect(taskMaker.getTaskCounter()).toBe(3);
        await sleep(100);
        expect(taskMaker.getTaskCounter()).toBe(1);
    });

});


