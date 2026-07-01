import { describe, test, expect, beforeEach } from 'vitest';
import { TaskMaker } from './task-maker.js';

describe('TestMaker', () => {
    let taskMaker: TaskMaker<string>;

    beforeEach(() => {
        taskMaker = new TaskMaker();
    });

    test('resolve test', async () => {
       const handle1 = taskMaker.makeTask('test1');
       
       handle1.task();
       expect(taskMaker.getTaskCount()).toBe(1);
       
       handle1.resolve('success');
       expect(taskMaker.getTaskCount()).toBe(0);
    });

    test('reject test', async () => {
        const handle1 = taskMaker.makeTask('test1');
        handle1.task();
       
        expect(taskMaker.getTaskCount()).toBe(1);

        handle1.reject(new Error('test error'));
        expect(handle1.promise).rejects.toThrow('test error');
        expect(taskMaker.getTaskCount()).toBe(0);
    });

    test('taskCount test', async () => {
        const handle1 = taskMaker.makeTask('test1');
        const handle2 = taskMaker.makeTask('test2');
        const handle3 = taskMaker.makeTask('test3');

        expect(taskMaker.getTaskCount()).toBe(0);
        handle1.task();
        expect(taskMaker.getTaskCount()).toBe(1);

        handle2.task();
        expect(taskMaker.getTaskCount()).toBe(2);

        handle3.task();
        expect(taskMaker.getTaskCount()).toBe(3);

        handle1.resolve('ok');
        expect(taskMaker.getTaskCount()).toBe(2);

        handle2.resolve('ok');
        expect(taskMaker.getTaskCount()).toBe(1);

        handle3.resolve('ok');
        expect(taskMaker.getTaskCount()).toBe(0);
    });
});

