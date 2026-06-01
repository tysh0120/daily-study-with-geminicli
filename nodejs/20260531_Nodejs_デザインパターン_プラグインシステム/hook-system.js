/*
 * 勘違いポイント
 * フックのイメージがよくわかってなかった
 * webpackなどの内部で使われているらしい
 * タイミング: 実行前 / 組立開始 / 組立中 / ファイル書き出し前 / 完了時
 * に対してそこに実行したい処理（プラグイン）を動的に登録できる仕組み
 * 1. コンストラクタで受け取る引数は、今から定義するフックが受け付ける引数の説明になっている
 *    (配列の第n要素は第n引数の説明）
 * 2. 実行タイミングになった際に、call / promise の引数に具体的な引数が指定される
 */

class PluginError extends Error {}

class HookBase {
    constructor(data) {
        this.data = data;
        this.taps = new Map();
        this.errors = [];
    }

    tap(name, fn) {
       this.taps.set(name, fn);
    }

}

class SyncHook extends HookBase {
    call(...args) {
        for (const [name, fn] of this.taps) {
            try {
                console.log(`${name} 実行中`);
                fn(...args)
            } catch (e) {
                console.error(`エラー発生 ${e.message}`);
                const pluginError = new PluginError(`プラグインでエラー発生 ${name}: ${e.message}`); 
                pluginError.originalError = e;
                throw pluginError;
            }
        }
    }
}

class AsyncHookBase extends HookBase {
    tapPromise(name, promise) {
        this.tap(name, promise);
    }

    async promise() {}
}

class AsyncSeriesHook extends AsyncHookBase {
    async promise(...args) {
        for (const [name, fn] of this.taps) {
            try {
                console.log(`${name} 実行中`);
                await fn(...args);
            } catch (e) {
                console.error(`エラー発生 ${e.message}`);
                const pluginError = new PluginError(`プラグインでエラー発生 ${name}: ${e.message}`); 
                pluginError.originalError = e;
                throw pluginError;
            }
        }
    }
}

class AsyncWaterfallHook extends AsyncHookBase {
    async promise(...args) {
        let data = args[0];
        const rest = args.slice(1);
        for (const [name, fn] of this.taps) {
            try {
                console.log(`${name} 実行中`);
                data = await fn(...[data, ...rest]);
            } catch (e) {
                console.error(`エラー発生 ${e.message}`);
                const pluginError = new PluginError(`プラグインでエラー発生 ${name}: ${e.message}`); 
                pluginError.originalError = e;
                throw pluginError;
            }
        }
        return data;
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
    const syncHook = new SyncHook(["data"]);
    syncHook.tap('add accent', data => console.log(data + "!"));
    syncHook.tap('upper', data => console.log(data.toUpperCase()));

    console.log(syncHook.call('hello'));

    (async () => {
        console.log('AsyncSeriesHook実行');
        const asyncHook = new AsyncSeriesHook("data");

        asyncHook.tapPromise('add accent', async (data) => {
            console.log(await createPromise(data + '!', 100, 0.3));
        });
        asyncHook.tapPromise('upper', async (data) => {
            console.log(await createPromise(data.toUpperCase(), 100, 0.3));
        });
        try {
            await asyncHook.promise("hello");
        } catch (e) {
            console.log(`エラー発生 ${e.message}`);
        }

        console.log('AsyncWaterfallHook実行');
        const asyncWHook = new AsyncWaterfallHook(["data"]);
        asyncWHook.tapPromise('add accent', async (data) => {
            return createPromise(data + '!', 100, 0.3);
        });
        asyncWHook.tapPromise('upper',  async (data) => {
            return createPromise(data.toUpperCase(), 100, 0.3)
        });
        try {
            const result = await asyncWHook.promise("hello");
            console.log(result);
        } catch (e) {
            console.error(`エラー発生 ${e.message}`);
        }

    })();
}

