const createTask = (id, period, rate = 0) => {
    return async () => {
        try {
            console.log(`${id} started`);
            await new Promise((resolve, reject) => setTimeout(Math.random() < rate ? reject : resolve, period));
            console.log(`${id} successed`);
            return `${id} success`;
        } catch (e) {
            console.error('Server Error!');
            throw e;
        }
    }
}

class TaskRunner {
    constructor(concurrency) {
        this.concurrency = concurrency;
        this.runnings = 0;
        this.queues = {};
        this.priorities = [];
    }

    enqueue(priority, task) {
        if (!(priority in this.queues)) {
            this.queues[priority] = [];
            this.priorities = Object.keys(this.queues).sort((x, y) => y - x);
        }
        this.queues[priority].push(task);
    }

    dequeue() {
        for (const priority of this.priorities) {
            const el = this.queues[priority].shift();
            if (el) return el;
        }
    }

    next() {
        const nextEl = this.dequeue();
        if (nextEl) nextEl();
    }

    async run(task, priority) {
        while (true) {
            if (this.runnings == this.concurrency) {
                await new Promise(resolve => {
                    this.enqueue(priority, resolve);
                });
            }
            try {
                this.runnings++;
                return await task();
            } catch (e) {
                console.error("エラー発生", e)
            } finally {
                this.runnings--;
                this.next();
            }
        }
    }
}

(async () => {
    const runner = new TaskRunner(2);
    await Promise.all(
        [...new Array(10)].map(_ => {
            const idx = Math.floor(3*Math.random());
            return runner.run(createTask(['Low', 'Mid', 'High'][idx],
                                         2000*Math.random(),
                                         0.3),
                              [0, 5, 10][idx])
        })
    )
        .then(res => console.log(res))
        .catch(err => console.error(err))
})();


