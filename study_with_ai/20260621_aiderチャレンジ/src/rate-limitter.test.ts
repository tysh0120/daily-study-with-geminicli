import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { RateLimitter } from './rate-limitter.js';
import { TaskMaker } from './testutil/task-maker.js';
//import whyIsNodeRunning from 'why-is-node-running'; 
// ↑ taskの残存調査用。調査時にコメントアウトしてafterEachのコメントも解除

async function sleep(ms: number): Promise<void> { 
    await new Promise(resolve => setTimeout(resolve, ms));
}


describe('RateLimitter', () => {
    let rateLimitter: RateLimitter<string>;
    let taskMaker: TaskMaker<string>;

    beforeEach(() => {
        rateLimitter = new RateLimitter({ limit: 2, interval: 100 });
        taskMaker = new TaskMaker();
    });

    afterEach(({task}) => {
        rateLimitter.shutdown();
        // ↓ taskの残存調査用。調査時にコメントアウトしてafterEachのコメントも解除
        //console.log(`\n${ task.name } remaining handles ============`);
        //whyIsNodeRunning();
    });

    test('runは最大実行数までのタスクを起動する', async () => {
        const handle1 = taskMaker.makeTask('task1');
        const handle2 = taskMaker.makeTask('task2');
        const handle3 = taskMaker.makeTask('task3');
    
        const result1 = rateLimitter.run(handle1.task);
        const result2 = rateLimitter.run(handle2.task);
        const result3 = rateLimitter.run(handle3.task);
        
        expect(taskMaker.getTaskCount()).toBe(2);
        
        handle1.resolve('success1');
        expect(taskMaker.getTaskCount()).toBe(1);
        expect(await result1).toBe('success1');

        await sleep(110);
        expect(taskMaker.getTaskCount()).toBe(2);
       
        handle2.resolve('success2');
        await sleep(5);
        expect(taskMaker.getTaskCount()).toBe(1);
        expect(await result2).toBe('success2');
     
        handle3.resolve('success3');
        await sleep(5);
        expect(taskMaker.getTaskCount()).toBe(0);
        expect(await result3).toBe('success3');
     
        expect(taskMaker.getTaskRecords().size).toBe(3);
    });

    test('reject時も次のタスクが動く', async () => {
        const handle1 = taskMaker.makeTask('task1');
        const handle2 = taskMaker.makeTask('task2');
        const handle3 = taskMaker.makeTask('task3');

        const result1 = rateLimitter.run(handle1.task);
        const result2 = rateLimitter.run(handle2.task);

        expect(taskMaker.getTaskCount()).toBe(2);

        handle1.reject(new Error('エラー発生'));
        result1.catch(e => null);
        expect(taskMaker.getTaskCount()).toBe(1);

        rateLimitter.run(handle3.task);
        // 後続はインターバル経過までは実行されない
        expect(taskMaker.getTaskCount()).toBe(1);

        await sleep(100);
        // 後続はインターバル経過後実行される
        expect(taskMaker.getTaskCount()).toBe(2);

        handle2.resolve('ok');
        handle3.resolve('ok');
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

        handle1.resolve('ok');
        handle2.resolve('ok');
        handle3.resolve('ok');
    });


    test('実行待ちキューのエントリが無くなった後', async () => {
        const handle1 = taskMaker.makeTask('task1');
        const handle2 = taskMaker.makeTask('task2');
        
        rateLimitter.run(handle1.task);
        rateLimitter.run(handle2.task);

        handle1.resolve('ok');
        await sleep(5);
        expect(taskMaker.getTaskCount()).toBe(1);
 
        handle2.resolve('ok');
        await sleep(5);
        expect(taskMaker.getTaskCount()).toBe(0);

        const handle3 = taskMaker.makeTask('task3');
        rateLimitter.run(handle3.task);

        await sleep(100);
        expect(taskMaker.getTaskCount()).toBe(1);
    });

    test('shutdown で実行待ちのキューがreject', async () => {
        const handle1 = taskMaker.makeTask('task1');
        const handle2 = taskMaker.makeTask('task2');
        const handle3 = taskMaker.makeTask('task3');

        const result1 = rateLimitter.run(handle1.task);
        const result2 = rateLimitter.run(handle2.task);
        const result3 = rateLimitter.run(handle3.task);

        await sleep(10);
        expect(taskMaker.getTaskCount()).toBe(2);
        result3.catch(e => null); // result2 がunhandled になるのを抑止
        rateLimitter.shutdown();
        
        handle1.resolve('ok');
        expect(result1).resolves.toBe('ok');
        
        handle2.resolve('ok');
        expect(result2).resolves.toBe('ok');

        await sleep(100);

        expect(result3).rejects.toThrow('shutdown');
    });
});

