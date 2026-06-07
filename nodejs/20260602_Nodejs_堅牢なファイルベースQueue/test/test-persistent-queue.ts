import assert from 'node:assert/strict';
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
assert.equal(persistentQueue.size(), 1);
// queueファイル
assert.equal(await fs.readFile('queues/test-queue.queue', 'utf-8'), '1\n', 'queueファイルの中身');
assert.equal(await fs.readFile('queues/test-queue.manifest', 'utf-8'), "[0,2]", 'manifestファイル');

await persistentQueue.enqueue(2);
assert.equal(persistentQueue.size(), 2);
assert.equal(await fs.readFile('queues/test-queue.queue', 'utf-8'), '1\n2\n', 'queueファイルの中身');
assert.equal(await fs.readFile('queues/test-queue.manifest', 'utf-8'), "[0,4]", 'manifestファイル');
assert.equal(persistentQueue.peek(), 1, 'peekは先頭要素を返却');

assert.equal(await persistentQueue.dequeue(), 1, 'dequeueは先頭要素を返却');
assert.equal(persistentQueue.size(), 1, 'dequeueは要素を一つ減らす');
assert.equal(await fs.readFile('queues/test-queue.manifest', 'utf-8'), "[2,4]", 'manifestファイル');

assert.equal(await persistentQueue.dequeue(), 2, 'dequeueは先頭要素を返却');
assert.equal(persistentQueue.size(), 0, 'dequeueは要素数を一つ減らす');
assert.equal(await fs.readFile('queues/test-queue.manifest', 'utf-8'), "[4,4]", 'manifestファイル');

// purge
assert.equal(await fs.readFile('queues/test-queue.queue', 'utf-8'), '1\n2\n');
await persistentQueue.purge();
assert.equal(await fs.readFile('queues/test-queue.queue', 'utf-8'), '');
assert.equal(await fs.readFile('queues/test-queue.manifest', 'utf-8'), '[0,0]');
// queueが空でdequeueしたとき
await assert.rejects(
    () => persistentQueue.dequeue(),
    QueueEmptyError,
    "Queueが空の時dequeueするとQueueEmptyErrorが発生"
);
// queueが空でpeekしたとき
assert.equal(persistentQueue.peek(), undefined);
// recovery
await fs.writeFile('queues/test-recovery.queue', "1\n2\n3\n");
await fs.writeFile('queues/test-recovery.manifest', '[0,6]');
const recoveredQueue = await PersistentQueue.create('test-recovery')
assert.equal(recoveredQueue.size(), 3);
assert.equal(await recoveredQueue.dequeue(), 1);
assert.equal(await recoveredQueue.dequeue(), 2);
assert.equal(await recoveredQueue.dequeue(), 3);
assert.equal(recoveredQueue.size(), 0);

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
assert.equal(truncateQueue.size(), 1);
await truncateQueue.enqueue(2);
assert.equal(truncateQueue.size(), 2);
assert.equal(await fs.readFile('queues/test-truncate.queue', {encoding: 'utf-8'}), '1\n2\n');
assert.equal(await fs.readFile('queues/test-truncate.manifest', {encoding: 'utf-8'}), '[0,4]');

// オフバイワン
await fs.writeFile('queues/test-off-by-one.queue', '1\n2\n3\n');
await fs.writeFile('queues/test-off-by-one.manifest', '[2,4]');
const oboQueue = await PersistentQueue.create('test-off-by-one');
assert.equal(1, oboQueue.size());
assert.equal(2, oboQueue.peek());

