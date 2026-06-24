### 課題：レートリミッター（Rate Limiter）の実装

指定した時間枠（インターバル）内に実行できるタスクの最大数を制限する `RateLimiter`
クラスを実装してください。制限に達している場合は、次に実行可能になるまでタスクを待機（キューイング）させ、時間が経過したら順次実行を再開する
ようにしてください。

#### 要件
1. `constructor(limit, interval)`:
   - `limit`: `interval` ミリ秒の間に実行できるタスクの最大数。
   - `interval`: 制限の基準となる時間枠（ミリ秒）。

2. `async run(task)`:
   - 非同期関数（またはPromiseを返す関数）`task` を受け取り、実行結果を返します。
   - 実行枠に空きがあれば即座に実行します。
   - 実行枠が埋まっている場合は、古いタスクの実行開始から `interval` ミリ秒経過して枠が空くまで待機してから実行します。

#### 使用例（イメージ）

```javascript
const limiter = new RateLimiter(2, 1000); // 1秒間に最大2タスクまで

const task = (id) => async () => {
    console.log(`Task ${id} started at ${new Date().toISOString()}`);
    await new Promise(resolve => setTimeout(resolve, 100));
    return `Result ${id}`;
};

// 以下のタスクを同時に登録した場合、

// Task 1と2は即座に実行され、Task 3と4は約1秒後に実行されること。

limiter.run(task(1));
limiter.run(task(2));
limiter.run(task(3));
limiter.run(task(4));
```

