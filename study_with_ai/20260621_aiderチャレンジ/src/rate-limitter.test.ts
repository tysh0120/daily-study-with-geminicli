import { describe, test, expect, beforeEach } from 'vitest';
import { RateLimitter } from './rate-limitter.js';
import { TaskMaker } from './testutil/task-maker.js';

async function sleep(ms: number): Promise<void> { 
    await new Promise(resolve => setTimeout(resolve, ms));
}


describe('RateLimitter', () => {
    let rateLimitter: RateLimitter;
    let taskMaker: TaskMaker<string>;

    beforeEach(() => {
        rateLimitter = new RateLimitter({ limit: 2, interval: 100 });
        taskMaker = new TaskMaker();
    });

    test('runは最大実行数までのタスクを起動する', async () => {
        const handle1 = taskMaker.makeTask('task1');
        const handle2 = taskMaker.makeTask('task2');
        const handle3 = taskMaker.makeTask('task3');

        rateLimitter.run(handle1.task);
        rateLimitter.run(handle2.task);
        rateLimitter.run(handle3.task);
        
        expect(taskMaker.getTaskCount()).toBe(2);
        
        handle1.resolve('success');
        expect(taskMaker.getTaskCount()).toBe(1);
        await sleep(110);
        expect(taskMaker.getTaskCount()).toBe(2);
       
        handle2.resolve('success');
        sleep(5);
        expect(taskMaker.getTaskCount()).toBe(1);
 
        handle3.resolve('success');
        sleep(5);
        expect(taskMaker.getTaskCount()).toBe(0);

        expect(taskMaker.getTaskRecords().size).toBe(3);
        console.log(taskMaker.getTaskRecords());

    });

    test('runはタスク開始から規定時間を超えたらまだ終了していなくても最大実行数のタスクを実行する', async () => {
        const handle1 = taskMaker.makeTask('task1');
        const handle2 = taskMaker.makeTask('task2');
        const handle3 = taskMaker.makeTask('task3');

        rateLimitter.run(handle1.task);
        rateLimitter.run(handle2.task);
        rateLimitter.run(handle3.task);

        expect(taskMaker.getTaskCount()).toBe(2);
        await sleep(100);
        expect(taskMaker.getTaskCount()).toBe(3);
    });


    test('実行待ちキューのエントリが無くなった後', async () => {
        const handle1 = taskMaker.makeTask('task1');
        const handle2 = taskMaker.makeTask('task2');
        
        rateLimitter.run(handle1.task);
        rateLimitter.run(handle2.task);

        handle1.resolve('ok');

        expect(taskMaker.getTaskCount()).toBe(1);
 
        handle2.resolve('ok');
        expect(taskMaker.getTaskCount()).toBe(0);

        const handle3 = taskMaker.makeTask('task3');
        rateLimitter.run(handle3.task);

        await sleep(100);
        console.log(taskMaker);
        expect(taskMaker.getTaskCount()).toBe(1);
    });
});

