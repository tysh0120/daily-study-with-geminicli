// 30%の確率で成功し、それ以外は1.5秒かかる、あるいは失敗する不安定な関数
const unstableApiCall = async () => {
    const rand = Math.random();
    await new Promise(res => setTimeout(res, rand * 2000));
    if (rand < 0.3) return "Success!";
    throw new Error("Server Error");
};

const fetchWithRetry = async (task, options) => {
    const {timeout, retries} = options;
    let counter = 0;
    let res;
    for (let i = 0; i < retries; i++) {
        let timerId;
        try {
            console.log(`${i}th try`)
            // タイマー処理
            const res = await execWithTimeout(timeout, task);
            return res;
        } catch (e) {
            // リトライ回数上限
            if (i == retries - 1) throw e;
            await new Promise(resolve => setTimeout(resolve, 100*2^i))
        }
    }
};

const execWithTimeout = (timeout, task, ...params) => {
    let timerId;
    const timer = new Promise((_, reject) => timerId = setTimeout(reject, timeout, 'タイムアウトした'));
    try {
        return Promise.race([timer, task(...params)]);
    } finally {
        clearTimeout(timerId);
    }
}

// 実行例
fetchWithRetry(unstableApiCall, { retries: 3, timeout: 1000 })
    .then(console.log)
    .catch(console.error);

