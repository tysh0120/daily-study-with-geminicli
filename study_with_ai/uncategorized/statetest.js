class A {
    setState(state) {
        this.state = state;
    }

    async exec() {
        return this.state.exec();
    }
}


class AA extends A {
    async exec() {
        return 'AA';
    }
}

class AB extends A {
    async exec() {
        return 'AB';
    }
}


const a = new A();

a.setState(new AA);
console.log(await a.exec());

a.setState(new AB);
console.log(await a.exec());

