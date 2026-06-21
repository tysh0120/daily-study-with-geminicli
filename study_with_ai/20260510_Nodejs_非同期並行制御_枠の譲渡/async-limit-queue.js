import { EventEmitter } from 'events';

const task = (id, ms) => async () => {
    console.log(`Task ${id} started`);
    await new Promise(resolve => setTimeout(resolve, ms));
    console.log(`Task ${id} finished`);
    return id;
};

class AsyncLimitQueue {
    constructor(limit) {
        this.limit = limit;
        this.counter = 0;
        this.queue = [];
    }

    async push(task) {
        if (this.counter == this.limit) {
            await new Promise(forResolved => this.queue.push(forResolved));
        } else {
            this.counter++;
        }
        try {
            return await task();
        } finally {
            const nextResolve = this.queue.shift();
            if (nextResolve) {
                nextResolve();
             } else {
                this.counter--;
             }
        }
    }
}

const queue = new AsyncLimitQueue(2);

queue.push(task(1, 1000)).then(res => console.log(`result: ${res}`));
queue.push(task(2, 500)).then(res => console.log(`result: ${res}`));
queue.push(task(3, 300)).then(res => console.log(`result: ${res}`));

