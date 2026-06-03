import assert from 'assert';
import * as fs from 'fs/promises';
import { PersistentQueue, QueueEmptyError, DuplicateNameError } from '../src/persistent-queue.js';

const persistentQueue = new PersistentQueue('test-queue');

await persistentQueue.enqueue(1);
assert.equal(1, persistentQueue.size());

assert.equal('[1]', await fs.readFile('queues/test-queue.queue', 'utf-8'), 'queueファイルの中身');

await persistentQueue.enqueue(2);
assert.equal(2, persistentQueue.size());
assert.equal('[1,2]', await fs.readFile('queues/test-queue.queue', 'utf-8'), 'queueファイルの中身');
assert.equal(1, persistentQueue.peek(), 'peekは先頭要素を返却');

assert.equal(1, await persistentQueue.dequeue(), 'dequeueは先頭要素を返却');
assert.equal(1, persistentQueue.size(), 'dequeueは要素を一つ減らす');

assert.equal(2, await persistentQueue.dequeue(), 'dequeueは先頭要素を返却');
assert.equal(0, persistentQueue.size(), 'dequeueは要素数を一つ減らす');

/*
await assert.rejects(
    persistentQueue.dequeue, {
    name: 'QueueEmptyError',
});
*/
// recovery
await fs.writeFile('queues/test-recovery.queue', JSON.stringify([1,2,3]));
const recoveredQueue = new PersistentQueue('test-recovery')
await recoveredQueue.recovery();

assert.equal(3, recoveredQueue.size());
assert.equal(1, await recoveredQueue.dequeue());
assert.equal(2, await recoveredQueue.dequeue());
assert.equal(3, await recoveredQueue.dequeue());
assert.equal(0, recoveredQueue.size());

// queueフォルダがなかった場合
const noDirQueue = new PersistentQueue('no-queue', './testqueue');
await noDirQueue.recovery();
try {
    await fs.access('./testqueue');
    await fs.rmdir('./testqueue');
} finally {}

// 名称重複時エラーを返す
const duplQueue = new PersistentQueue('dupl-name');
assert.throws(() => new PersistentQueue('dupl-name'),
              DuplicateNameError);

