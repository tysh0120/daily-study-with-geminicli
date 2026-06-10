import * as fs from 'node:fs/promises';
import { PersistentQueue } from '../src/persistent-queue.js';
import assert from 'node:assert/strict';

async function runTest() {
    const queueName = 'test-parse-empty';
    const queueFile = `./queues/${queueName}.queue`;
    const manifestFile = `./queues/${queueName}.manifest`;

    // Clean up
    try { await fs.rm(queueFile); } catch {}
    try { await fs.rm(manifestFile); } catch {}

    const q = await PersistentQueue.create<number>(queueName);
    await q.enqueue(1);
    
    // Clear the static set for testing purposes
    await q.close();
    
    // Simulate recovery to trigger loadFromQueueFile
    const q2 = await PersistentQueue.create<number>(queueName);
    assert.equal(q2.size(), 1);
    assert.equal(q2.peek(), 1);

    console.log('Test Passed!');
}

runTest().catch(e => {
    console.error('Test Failed!');
    console.error(e);
    process.exit(1);
});
