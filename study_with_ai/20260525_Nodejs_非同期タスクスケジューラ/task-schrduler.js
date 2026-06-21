import assert from 'node:assert';
const createTask = ({duration=1000, errorRate=0.3, name='task'}={}) => {
    return () => new Promise((resolve, reject) => {
        setTimeout(() => {
            if (Math.random() < errorRate) {
                reject(new Error(`${name} error`));
            } else {
                resolve(`${name} success`);
            }
        }, duration);
    });
}

const TASK_STATUS = {
    pending: 'pending',
    running: 'running',
    completed: 'completed',
    failed: 'failed'
}
class CyclicRefError extends Error {}
class TaskConflictError extends Error {}
class TimeoutError extends Error {}

class Task {
    constructor(name, task, dependencies=[]) {
        this.isAborted = false;
        this.name = name;
        this.task = task;
        this.dependencies = dependencies;
        this.status = TASK_STATUS.pending;
    }

    isRunnable() {
        return (this.status == TASK_STATUS.pending) &&
            (this.dependencies.findIndex(dt => dt.status != TASK_STATUS.completed) == -1);
    }

    isRunning() {
        return this.status == TASK_STATUS.running;
    }

    isDependOn(task) {
        if (task == this) {
            return true;
        }
        for (const dtask of task.dependencies) {
            if (this.isDependOn(dtask)) {
                return true;
            }
        }
        return false;
    }

    addDependency(task) {
        if (this.isDependOn(task)) {
            throw new CyclicRefError(`循環参照です。${task.name} depends on ${this.name}`);
        }
        this.dependencies.push(task);
    }

    async run() {
        return this.task();
    }
}

class TaskScheduler {
    constructor(tasks=[]) {
        this.report = {};
        this.tasks = [];

        for (const task of tasks) {
            this.addTask(task);
        }
    }

    addTask(task) {
        this.tasks.push(task);
    }

    async runAll(timeout=10000) {
        let finishTimer;
        try {
            this.checkAndRun();
            const pr = new Promise((resolve, reject) => this.finishToResolve = { resolve, reject });
            await Promise.race([
                pr,
                new Promise((_, reject) => {
                    finishTimer = setTimeout(() => {
                        this.isAborted = true;
                        reject(new TimeoutError(
                            `${timeout}ms を超えました。タイムアウトします`
                        ));
                    }, timeout);
                })
            ]);
        } catch (e) {
            console.error(`エラー発生 ${e.message}`);
        } finally {
            clearTimeout(finishTimer);
            console.log('処理終了');
            console.log('タスク 結果');
            for (const task of this.tasks) {
                console.log(`${task.name} ${task.status}`);
            }
        }
    }

    checkAndRun() {
        const runnableTasks = this.tasks.filter(x => x.isRunnable());
        for (const task of runnableTasks) {
            console.log('run', task.name);
            this.executeTask(task);
        }
    }

    checkCompletion() {
        return this.tasks.every(t => !t.isRunnable() && !t.isRunning())
    }

    async executeTask(task) {
        if (this.isAborted) return;

        console.log(`${task.name} started!`);
        task.status = TASK_STATUS.running;
        let result;
        try {
            result = await task.run();
            task.status = TASK_STATUS.completed;
            this.checkAndRun();
        } catch (e) {
            console.log('exception', e.message);
            task.status = TASK_STATUS.failed;
        } finally {
            console.log(`${task.name} finished!`);
        }
        if (this.checkCompletion()) {
            this.finishToResolve.resolve('finish');
        }
        return result;
    }

    getRunnableTask() {
        for (const [_, task] of this.tasks) {
            if (task.isRunnable()) {
                return task;
            }
        }
    }
}
const task1 = new Task('task1', createTask({name: 'task1'}));
const task2 = new Task('task2', createTask({name: 'task2'}));
const task3 = new Task('task3', createTask({name: 'task3'}));
assert(task1.isRunnable());
assert.equal(false, task1.isDependOn(task2));
task1.status = TASK_STATUS.completed
assert.equal(false, task1.isRunnable())

assert.throws(() => {
    task1.addDependency(task1);
}, {
    message: "循環参照です。task1 depends on task1"
});
assert.throws(() => {
    task1.addDependency(task2);
    task2.addDependency(task1);
}, {
    message: "循環参照です。task1 depends on task2"
});
const scheduler = new TaskScheduler([task1, task2]);

const t1 = new Task('t1', createTask({name: 't1'}));
const t2 = new Task('t2', createTask({name: 't2'}), [t1]);
const t3 = new Task('t3', createTask({name: 't3'}), [t2]);
const taskScheduler = new TaskScheduler([t1, t2, t3]);
await taskScheduler.runAll(10);
console.log('finished');
/* レビュー
 1. 正確性: ★★★★☆ (ほぼ完璧)
   * 状態管理: isAborted を導入したことで、タイムアウト後に余計なタスクが開始される問題が解消されました。
   * 終了判定: checkCompletion
     メソッドに切り出したことで、ロジックの意図が明確になり、成功・失敗のどちらのケースも網羅できています。
   * 懸念点: task1.isDependOn(task2) ですが、今の実装だと task1.dependencies をループして「引数の
     task」が「自分の依存先」に含まれるか調べています。これは 「自分は task2 に依存しているか？」 という意味になります。
       * task1.addDependency(task2) で「1 が 2 に依存する」関係を作った場合、task1.isDependOn(task2) は true
         になります。
       * ここが「どっちがどっちに依存しているか」の言葉の定義次第ですが、直感的にはあっています。

  2. 可読性: ★★★★★ (素晴らしい)
   * checkCompletion や isRunnable などのメソッド名が適切で、runAll のメインフローが非常に読みやすくなりました。
   * TASK_STATUS を文字列にしたことで、デバッグ時のログも見やすくなっています。

  3. 効率性: ★★★★☆ (良好)
   * filter(x => x.isRunnable()) によって、依存が解消されたタスクを「一斉に」開始できる並列性が実現できています。
   * 小ネタ: runAll の冒頭で this.checkAndRun() を呼んでいますが、もしタスクが一つも登録されていないと
     this.finishToResolve がセットされる前に executeTask が終わってしまう可能性があります。pr を作る直前に呼ぶか、pr の
     executor 内で呼ぶのがより安全です。
*/

