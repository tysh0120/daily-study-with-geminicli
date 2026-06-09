import * as fs from 'node:fs/promises';
import { PersistentQueue } from '../src/persistent-queue.js';
import assert from 'node:assert/strict';

async function runTest() {
    const queueName = 'test-utf8';
    const queueFile = `./queues/${queueName}.queue`;
    const manifestFile = `./queues/${queueName}.manifest`;

    // Clean up
    try { await fs.rm(queueFile); } catch {}
    try { await fs.rm(manifestFile); } catch {}

    const q = await PersistentQueue.create<string>(queueName);
    
    const msg = "あ"; // UTF-8: 3 bytes, JSON: "\"あ\"" (5 bytes total with \n?)
    // JSON.stringify("あ") -> "\"あ\"" (4 chars)
    // toQueueFileEntry -> "\"あ\"\n" (5 chars)
    // UTF-8 bytes: 1 (") + 3 (あ) + 1 (") + 1 (\n) = 6 bytes.
    
    await q.enqueue(msg);
    
    console.log('Memory Epos:', (q as any)._epos);
    const stats = await fs.stat(queueFile);
    console.log('File Size:', stats.size);

    // assert.equal((q as any)._epos, stats.size, "Epos should match file size");

    await q.dequeue();
    console.log('Memory Spos after dequeue:', (q as any)._spos);
    assert.equal((q as any)._spos, stats.size, "Spos should match bytes consumed");

    // Try recovery
    (PersistentQueue as any).allQueueNames.clear();
    assert.equal(q2.size(), 1, "Should recover 1 item");
    assert.equal(q2.peek(), msg, "Recovered item should match");

    console.log('Test Passed!');
}

runTest().catch(e => {
    console.error('Test Failed!');
    console.error(e);
    process.exit(1);
});
