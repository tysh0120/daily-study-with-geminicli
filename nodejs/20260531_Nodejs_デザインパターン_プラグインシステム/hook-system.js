class HookBase {
    constructor(data) {
        this.data = data;
        this.tasks = [];
    }

    tapPromise({ name, promise }) {
       this.tasks.push({name, promise});
    }

    promise() {}
}

class SyncHook extends HookBase {
    promise() {
        for (const task of this.tasks) {
            console.log(`${task.name} 実行中`);
            this.data = task.promise(this.data);
        }
        return this.data;
    }
}

class AsyncSeriesHook extends HookBase {
    async promise() {
        try {
            for (const task of this.tasks) {
                console.log(`${task.name} 実行中`);
                this.data = await task.promise(this.data);
            }
            return this.data;
        } catch (e) {
            console.error(`エラー発生 ${e.message}`);
            return;
        }
    }
}

class AsyncWaterfallHook extends HookBase {
    async promise() {
        let data = this.data;
        try {
            for (const task of this.tasks) {
                console.log(`${task.name} 実行中`);
                data = await task.promise(data);
            }
            return data;
        } catch (e) {
            console.error(`エラー発生 ${e}`);
        }
    }
}

if (require.main === module) {
    const createPromise = (resolveValue, latency=1000, errorRate=0.3) => {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                if (Math.random() < errorRate) reject(new Error('error'));
                else resolve(resolveValue);
            }, latency)
        });
    };


    console.log('SyncHook実行');
    const syncHook = new SyncHook(["hello"]);
    syncHook.tapPromise({name: 'add accent', promise: data => data + "!"});
    syncHook.tapPromise({name: 'upper', promise: data => data.toUpperCase()});

    console.log(syncHook.promise());
    (async () => {
        console.log('AsyncSeriesHook実行');
        const asyncHook = new AsyncSeriesHook(["hello"]);

        asyncHook.tapPromise({name: 'add accent', promise: async (data) => {
            return createPromise(data + '!', 100, 0.3);
        }});
        asyncHook.tapPromise({name: 'upper', promise: async (data) => {
            return createPromise(data.toUpperCase(), 100, 0.3)
        }});
        console.log(await asyncHook.promise());

        console.log('AsyncWaterfallHook実行');
        const asyncWHook = new AsyncWaterfallHook(["hello"]);
        asyncWHook.tapPromise({name: 'add accent', promise: async (data) => {
            return createPromise(data + '!', 100, 0.3);
        }});
        asyncWHook.tapPromise({name: 'upper', promise: async (data) => {
            return createPromise(data.toUpperCase(), 100, 0.3)
        }});
        console.log(await asyncWHook.promise());
    })();
}

