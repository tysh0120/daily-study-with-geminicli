/*
【課題：自動クリーンアップ機能付き「スマート・キャッシュ」を作ってみよう】

  以下の要件を満たす SmartCache クラスを実装してください。

   1. 弱い参照の使用: Map の値としてオブジェクトを直接保持するのではなく、WeakRef を使用して保持してください。
   2. 自動クリーンアップ: オブジェクトが GC
      によって回収されたことを検知し、キャッシュ（Map）内の「空になったエントリー（キー）」を自動的に削除するために
      FinalizationRegistry を使用してください。
   3. インターフェース:
       * set(key, value): オブジェクトをキャッシュに保存。
       * get(key): 値を返す。既に GC されていたら undefined を返す。
       * has(key): キーが存在し、かつ値が GC されていないか確認。
   4. 動作検証スクリプト:
       * 大きなオブジェクトをキャッシュに入れ、参照を切り、global.gc()
         を呼び出して、キャッシュからキーが自動的に消えることを確認してください。
       * ※実行時は node --expose-gc フラグが必要です。

  制約:
   * WeakRef はオブジェクト（および登録済みの
     Symbol）のみを保持できます。プリミティブ（文字列や数値）を値として保存しようとした場合のハンドリングも考慮してみて
     ください。
*/
const assert = require('node:assert');

class SmartCache {
    constructor() {
        this._map = new Map();
        this._reg = new FinalizationRegistry(handleVal => {
            console.log(`${handleVal} がGCされた`);
            console.log('Map size was:', this._map.size);
            this._map.delete(handleVal);
            console.log('Map size is:', this._map.size);
        });
    }

    set(key, value) {
        if (! (value instanceof Object)) {
            throw new TypeError('valueはObject型のみ指定できます');
        }
        this._map.set(key, new WeakRef(value));
        this._reg.register(value, key);
    }

    get(key) {
        return this._map.get(key) && this._map.get(key).deref();
    }

    has(key) {
        return !!this.get(key);
    }
}

const sc = new SmartCache();

assert.throws(
    () => {
        sc.set('1', 1)
    },
    {
        name: 'TypeError',
        message: 'valueはObject型のみ指定できます'
    }
);

let a = {a: 1}
sc.set('a', a);
assert.ok(sc.has('a'));
assert.deepEqual({a: 1}, sc.get('a'));



let bigData = {
    title: 'bigdata',
    payload: new Array(1000).fill('🚀')
}
sc.set('bigData', bigData);

// 強い参照を切る
bigData = null;

setTimeout(global.gc, 3000);
const timer = setInterval(() => {
    if (!sc.get('bigData')) {
        console.log('bigDataが消えた');
        clearInterval(timer);
        return;
    }
    console.log('bigDataはまだある');
}, 1000);

