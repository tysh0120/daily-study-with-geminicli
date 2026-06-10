import assert from 'node:assert/strict';
import * as fs from 'fs/promises';
import { PersistentQueue, QueueEmptyError, DuplicateNameError } from '../src/persistent-queue.js';

try {
    await fs.rm('queues/test-queue.queue');
    await fs.rm('queues/test_queue.manifest');
}
catch {
}
const persistentQueue = await PersistentQueue.create<number>('test-queue');
await persistentQueue.clear();
assert.equal(persistentQueue.size(), 0);
assert.equal(await fs.readFile('queues/test-queue.queue', 'utf-8'), '', 'queueファイルの中身');
assert.equal(await fs.readFile('queues/test-queue.manifest', 'utf-8'), '[0,0]', 'manifestファイルの中身');

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
await PersistentQueue.create<number>('no-queue', './testqueue');
try {
    await fs.access('./testqueue');
    await fs.rmdir('./testqueue');
} finally {}

// 名称重複時エラーを返す
const duplQueue = await PersistentQueue.create<string>('dupl-name');
await duplQueue.enqueue('a');
assert.rejects(async () => await PersistentQueue.create('dupl-name'),
              DuplicateNameError);
// closeで名称を解放
duplQueue.close();
assert.doesNotReject(async () => await fs.access('queues/dupl-name.queue'), 'closeでファイルは消えない');
assert.doesNotReject(async () => await fs.access('queues/dupl-name.manifest'), 'closeでファイルは消えない');
assert.doesNotReject(PersistentQueue.create('dupl-name'), 'closeで使用していた名称の新インスタンス生成可能に');

// 後ろの余分なデータを削除
await fs.writeFile('queues/test-truncate.queue', '1\n2\n3\n');
await fs.writeFile('queues/test-truncate.manifest', '[0,2]');
const truncateQueue = await PersistentQueue.create<number>('test-truncate');
assert.equal(truncateQueue.size(), 1);
await truncateQueue.enqueue(2);
assert.equal(truncateQueue.size(), 2);
assert.equal(await fs.readFile('queues/test-truncate.queue', {encoding: 'utf-8'}), '1\n2\n');
assert.equal(await fs.readFile('queues/test-truncate.manifest', {encoding: 'utf-8'}), '[0,4]');

// オフバイワン
await fs.writeFile('queues/test-off-by-one.queue', '1\n22\n333\n');
await fs.writeFile('queues/test-off-by-one.manifest', '[2,5]');
const oboQueue = await PersistentQueue.create<number>('test-off-by-one');
assert.equal(oboQueue.size(), 1);
assert.equal(oboQueue.peek(), 22);

// higiwatermark超えのメッセージ
await fs.writeFile('queues/test-highwatermark.queue', '"aaa"\n"bbb"\n"ccc"\n');
await fs.writeFile('queues/test-highwatermark.manifest', '[6,12]');
const hwQueue = await PersistentQueue.create<string>('test-highwatermark', undefined, 
                                             {readHighWaterMark: 1, writeHighWaterMark: 1});
assert.equal(hwQueue.size(), 1);
assert.equal(hwQueue.peek(), 'bbb');
for (let i = 0; i < 10; i++) {
    await hwQueue.enqueue(i.toString());
}
assert(await hwQueue.dequeue(), 'bbb');
for (let i = 0; i < 5; i++) {
    assert.equal(await hwQueue.dequeue(), i.toString());
}
assert.equal(hwQueue.size(), 5);
await hwQueue.purge();

assert.equal(await fs.readFile('queues/test-highwatermark.manifest', 'utf-8'), '[0,20]');
assert.equal(hwQueue.size(), 5);
for (let i = 5; i < 9; i++) {
    assert.equal(await hwQueue.dequeue(), i.toString());
}
await hwQueue.purge();
assert.equal(await fs.readFile('queues/test-highwatermark.manifest', 'utf-8'), '[0,4]');
assert.equal(hwQueue.size(), 1);

await hwQueue.dequeue();
await hwQueue.purge();
assert.equal(await fs.readFile('queues/test-highwatermark.manifest', 'utf-8'), '[0,0]');
assert.equal(hwQueue.size(), 0);

