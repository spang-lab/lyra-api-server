const path = require('path');
const Injector = require('./components/injector.js');

(async () => {
    const seed = {
        rootPath: __dirname,
        componentPath: path.join(__dirname, 'components'),
    };
    const injector = new Injector();
    await injector.inject(seed);

    const logger = injector.get('default.Logger');
    try {
        await injector.init();
    } catch (e) {
        logger.error('### Initalization error! ###');
        logger.error(e);
        process.exit(1);
    }
    const server = injector.get('ServerProcess');
    await server.run();
})();
