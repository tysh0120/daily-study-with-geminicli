import assert from 'node:assert/strict';
import * as fs from 'fs/promises';
import { PersistentQueue } from '../src/persistent-queue.js';
import path from 'path';

const queueDir = './queues';
const queueName = 'test-utf8';

try {
    const q = await PersistentQueue.create<string>(queueName, queueDir);
    await q.clear();
    
    // "あ" is 3 bytes in UTF-8
    const msg = "あ";
    await q.enqueue(msg);
    
    assert.equal(q.size(), 1);
    
    // Check manifest
    const manifestContent = await fs.readFile(path.join(queueDir, `${queueName}.manifest`), 'utf-8');
    const [spos, epos] = JSON.parse(manifestContent);
    
    // JSON.stringify("あ") + "\n" -> "\"あ\"\n"
    // "\"" (1 byte) + "あ" (3 bytes) + "\"" (1 byte) + "\n" (1 byte) = 6 bytes
    assert.equal(epos, 6, 'epos should be 6 bytes for "あ"');
    q.close();

    // Recovery test
    const q2 = await PersistentQueue.create<string>(queueName, queueDir);
    assert.equal(q2.size(), 1);
    assert.equal(q2.peek(), "あ");
    
    console.log("UTF-8 test passed!");
    
    // Clean up
    await fs.rm(queueDir, { recursive: true, force: true });
} catch (e) {
    console.error("UTF-8 test failed!");
    console.error(e);
    process.exit(1);
}
