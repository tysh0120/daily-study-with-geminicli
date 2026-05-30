/*
 ✦ 【今日のテーマ】
  Node.js Streams における「バックプレッシャー（背圧）」の制御

  【課題：低速な書き込み先へのデータ流量制御】
  大量のデータを生成する Readable ストリームから、処理が非常に遅い Writable
  ストリームへデータを転送するプログラムを実装してください。

  具体的な要件：
   1. Readable側: ランダムな文字列（または数値）を連続的に生成するカスタムストリームを作成してください。
   2. Writable側: 書き込み（_write）に意図的な遅延（例: 50ms）が発生するカスタムストリームを作成してください。
   3. 制御ロジック: pipe() や pipeline() を使わずに、'data' イベント、'drain' イベント、および stream.write()
      の戻り値を直接利用して、メモリ消費を抑えながら（バックプレッシャーを考慮して）データを転送してください。
   4. 可視化: 現在の書き込みバッファの状態（writable.writableLength
      など）を定期的にログ出力し、適切に流量が制限されていることを確認できるようにしてください。

*/
const stream = require('stream');

class MyReadable extends stream.Readable {
    constructor(options) {
        super(options);
        this.counter = 0;
    }
    _read(size) {
        if (this.counter == 20) {
            this.push(null);
            return;
        }
        const randomStr = [...Array(size)].map(_ => Math.floor(Math.random() * 10).toString()).join('');
        this.push(randomStr);
        this.counter++;
    }
}

class MyDelayWritable extends stream.Writable {
    constructor(options) {
        super(options);
    }

    _write(chunk, encode, callback) {
        console.log('_write', chunk)
        new Promise(resolve => setTimeout(() => resolve(chunk), 500))
            .then(
                chunk => {
                    console.log(chunk);
                    callback();
                }
            );
    }
}

const myReadable = new MyReadable({ highWaterMark: 5 });
const myWritable = new MyDelayWritable({ highWaterMark: 50 });
myReadable.on('data', (chunk) => {
    console.log(myWritable.writableLength);
    if (!myWritable.write(chunk)) {
        myReadable.pause();
    }
});
myWritable.on('drain', () => {
    myReadable.resume();
});

