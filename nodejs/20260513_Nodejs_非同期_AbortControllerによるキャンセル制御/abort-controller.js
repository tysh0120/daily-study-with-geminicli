/*
  1. 【今日のテーマ】
  現代的な非同期処理のキャンセル制御 (AbortController)

  Node.js v14.17.0以降、標準で利用可能になった AbortController
  を使い、ネストされた複雑な非同期処理を安全に、かつ即座に中断するパターンを学びます。

  2. 【課題：キャンセル可能なデータパイプラインを作ってみよう】

  複数のステップ（データ取得 → 加工 →
  保存）を順に実行するパイプラインにおいて、ユーザーの操作やタイムアウトによって「いつでも安全に中断できる」仕組みを構築
  してください。

  【具体的な要件】
   1. 階層的な伝播: 3つ以上のネストされた非同期関数（例: main -> processData -> fetchRemoteData）で、一つの AbortSignal
      を一貫して受け渡してください。
   2. 標準APIの利用: fetch（または模擬的なPromise）に対して signal
      を渡し、キャンセル時に即座にPromiseが拒否されるようにしてください。
   3. タイムアウトの実装: 処理全体が指定時間（例: 2秒）を超えたら自動的にキャンセルされるように設定してください。
   4. エラーハンドリング:
      キャンセルによる中断なのか、それとも他の例外（ネットワークエラーなど）なのかを判別し、適切にログ出力やクリーンアッ
      プを行ってください。
*/

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

