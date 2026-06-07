import assert from 'assert';
import * as fs from 'fs/promises';
import { PersistentQueue, QueueEmptyError, DuplicateNameError } from '../src/persistent-queue.js';

try {
    await fs.rm('queues/test-queue.queue');
    await fs.rm('queues/test_queue.manifest');
}
catch {
}
const persistentQueue = await PersistentQueue.create('test-queue');
persistentQueue.clear();
await persistentQueue.enqueue(1);
assert.equal(1, persistentQueue.size());
// queueファイル
assert.equal('1\n', await fs.readFile('queues/test-queue.queue', 'utf-8'), 'queueファイルの中身');
assert.equal("[0,2]", await fs.readFile('queues/test-queue.manifest', 'utf-8'), 'manifestファイル');

await persistentQueue.enqueue(2);
assert.equal(2, persistentQueue.size());
assert.equal('1\n2\n', await fs.readFile('queues/test-queue.queue', 'utf-8'), 'queueファイルの中身');
assert.equal("[0,4]", await fs.readFile('queues/test-queue.manifest', 'utf-8'), 'manifestファイル');
assert.equal(1, persistentQueue.peek(), 'peekは先頭要素を返却');

assert.equal(1, await persistentQueue.dequeue(), 'dequeueは先頭要素を返却');
assert.equal(1, persistentQueue.size(), 'dequeueは要素を一つ減らす');
assert.equal("[2,4]", await fs.readFile('queues/test-queue.manifest', 'utf-8'), 'manifestファイル');

assert.equal(2, await persistentQueue.dequeue(), 'dequeueは先頭要素を返却');
assert.equal(0, persistentQueue.size(), 'dequeueは要素数を一つ減らす');
assert.equal("[4,4]", await fs.readFile('queues/test-queue.manifest', 'utf-8'), 'manifestファイル');

// purge
assert.equal('1\n2\n', await fs.readFile('queues/test-queue.queue'));
await persistentQueue.purge();
assert.equal('', await fs.readFile('queues/test-queue.queue', 'utf-8'));
assert.equal('[0,0]', await fs.readFile('queues/test-queue.manifest', 'utf-8'));
// queueが空でdequeueしたとき
await assert.rejects(
    () => persistentQueue.dequeue(),
    QueueEmptyError,
    "Queueが空の時dequeueするとQueueEmptyErrorが発生"
);
// queueが空でpeekしたとき
assert.equal(undefined, persistentQueue.peek());
// recovery
await fs.writeFile('queues/test-recovery.queue', "1\n2\n3\n");
await fs.writeFile('queues/test-recovery.manifest', '[0,6]');
const recoveredQueue = await PersistentQueue.create('test-recovery')
assert.equal(3, recoveredQueue.size());
assert.equal(1, await recoveredQueue.dequeue());
assert.equal(2, await recoveredQueue.dequeue());
assert.equal(3, await recoveredQueue.dequeue());
assert.equal(0, recoveredQueue.size());

// queueフォルダがなかった場合
const noDirQueue = await PersistentQueue.create('no-queue', './testqueue');
try {
    await fs.access('./testqueue');
    await fs.rmdir('./testqueue');
} finally {}

// 名称重複時エラーを返す
const duplQueue = await PersistentQueue.create('dupl-name');
assert.rejects(async () => await PersistentQueue.create('dupl-name'),
              DuplicateNameError);

// 後ろの余分なデータを削除
await fs.writeFile('queues/test-truncate.queue', '1\n2\n3\n');
await fs.writeFile('queues/test-truncate.manifest', '[0,2]');
const truncateQueue = await PersistentQueue.create('test-truncate');
assert.equal(1, truncateQueue.size());
await truncateQueue.enqueue(2);
assert.equal(2, truncateQueue.size());
assert.equal('1\n2\n', await fs.readFile('queues/test-truncate.queue', {encoding: 'utf-8'}));
assert.equal('[0,4]', await fs.readFile('queues/test-truncate.manifest', {encoding: 'utf-8'}));


