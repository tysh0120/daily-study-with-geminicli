import { setTimeout } from 'node:timers/promises';
const TIMEOUT_PERIOD = 1000;

const main = async (url, { signal }) => {
    console.log(`main started for ${url}`);
    try {
        return await processData(url, { signal });
    } catch (e) {
        if (e.name == 'AbortError') {
            console.log('AbortError on main');
        } else {
            console.log('エラー発生 on main');
        }
        throw e;
    }
}

const processData = async (url, { signal }) => {
    console.log(`processData started for ${url}`);
    try {
        const result = await fetchRemoteData(url, { signal });
        return result.text();
    } catch (e) {
        if (e.name == 'AbortError') {
            console.log('AbortError on processData');
        } else {
            console.log('エラー発生 on processData');
        }
        throw e;
    }
}

const fetchRemoteData = async (url, { signal }) => {
    console.log(`fetchRemoteData started for ${url}`);
    try {
        return await fetch(url, { signal });
    } catch (e) {
        if (e.name == 'AbortError') {
            console.log('AbortError on fetchRemoteData');
        } else {
            console.log('エラー発生 on fetchRemoteData');
        }
        throw e;
    }
}

const urls = [
    'https://calapan.shop',
    'https://megumi-genki.com',
    'https://yahoo.co.jp'
];

const controller = new AbortController();
const timeoutController = new AbortController();
const timer = setTimeout(TIMEOUT_PERIOD, null, { signal: timeoutController.signal })
    .then(
        () => {
            controller.abort();
            console.log(`${TIMEOUT_PERIOD}ms で間に合いませんでした`);
        }
    )
    .catch(err => {
        if (err.name != 'AbortError') {
            console.error(err);
        }
        console.log('エラーだけど正常');
    });

Promise.allSettled(
    urls.map(url => main(url, { signal: controller.signal }))
)
    .then(res => console.log(res))
    .finally(timeoutController.abort())

