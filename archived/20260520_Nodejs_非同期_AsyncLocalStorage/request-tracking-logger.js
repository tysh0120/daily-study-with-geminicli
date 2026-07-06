import { AsyncLocalStorage } from 'node:async_hooks'; 
const asyncLocalStorage = new AsyncLocalStorage();

const logger = {
    log(message) {
        const id = asyncLocalStorage.getStore();
        console.log(`${id} ${message}`);
    }
};

const execute = async () => {
    logger.log('started');
    await waitDb();
    await waitService();
    logger.log('finished');
}

const waitDb = async () => {
    logger.log('start request DB');
    await new Promise(resolve => setTimeout(resolve, 1000));
    logger.log('finish request DB');
}

const waitService = async () => {
    logger.log('start request Service');
    await new Promise(resolve => setTimeout(resolve, 1000));
    logger.log('finish request Service');
}

let id = 1;
asyncLocalStorage.run(id++, execute);
asyncLocalStorage.run(id++, execute);

