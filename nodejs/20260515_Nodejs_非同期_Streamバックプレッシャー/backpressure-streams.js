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

