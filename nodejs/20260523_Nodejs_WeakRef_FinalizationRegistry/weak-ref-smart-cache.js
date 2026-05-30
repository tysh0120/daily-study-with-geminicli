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

