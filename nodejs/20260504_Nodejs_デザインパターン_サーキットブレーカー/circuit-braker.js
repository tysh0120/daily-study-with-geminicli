const createTask = (latency=1000, errorRate=0.3) => {
    return () => {
        return new Promise((resolve, reject) => {
            console.log('開始');
            setTimeout(() => Math.random() < errorRate ? reject(`エラー発生!!`) : resolve(`成功!!`), latency);
        });
    };
}

class CircuitBreaker {
    constructor(task, { failureThreshold, resetTimeout }) {
        this.task = task;
        this.failureThreshold = failureThreshold;
        this.resetTimeout = resetTimeout;

        this.close();
    }

    setState(state) {
        this.state = state;
    }

    open() {
        this.setState(new OpenState(this));
    }

    halfOpen() {
        this.setState(new HalfOpenState(this));
    }

    close() {
        this.setState(new ClosedState(this));
    }

    async call() {
        return this.state.exec();
    }
}

class CircuitBreakerState {
    constructor(breaker) {
        this.breaker = breaker;
        this.task = breaker.task;
        this.failureThreshold = breaker.failureThreshold;
        this.resetTimeout = breaker.resetTimeout;
    }
}

class ClosedState extends CircuitBreakerState {
    constructor(breaker) {
        super(breaker);
        this.failureCount = 0;
    }

    async exec() {
        console.log('Close');
        try {
            const res = await this.task();
            this.failureCount = 0;
            return res;
        } catch (e) {
            this.failureCount++;
            if (this.failureCount == this.failureThreshold) {
                this.breaker.open();
            }
            throw e;
        }
    }
}

class OpenState extends CircuitBreakerState {
    constructor(breaker) {
        super(breaker);
        this.timer = setTimeout(() => {
            this.breaker.halfOpen();
            clearTimeout(this.timer);
            this.timer = null;
        }, this.resetTimeout);
    }

    async exec() {
        console.log('Open');
        throw new Error('Service Unavailable');
    }
 }

class HalfOpenState extends CircuitBreakerState {
    async exec() {
        console.log('Half Open');
        try {
            const res = await this.task();
            this.breaker.close();
            return res;
        } catch (e) {
            console.log('failed half open')
            this.breaker.open();
            throw e;
        }
    }
}

const breaker = new CircuitBreaker(createTask(100, 0.5), {
    failureThreshold: 3,
    resetTimeout: 1000
});

//breaker.call();
(async () => {
    for (let i = 0; i < 100; i++) {
        try {
            let res = await breaker.call();
            console.log(res);
        } catch (e) {
            console.log(e);
            if (e.message == 'Service Unavailable') {
                await new Promise(res => setTimeout(res, 1000));
            }
        }
    }
})()

