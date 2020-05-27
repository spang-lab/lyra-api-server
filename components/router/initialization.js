const LyraComponent = require('lyra-component');
/**
 * Initialization module
 * @memberof module:Routers
 * @class
 */
class Initialization extends LyraComponent {
    static requires() {
        return {
            apiRouter: 'router.ApiRouter',
        };
    }

    async init() {
        await this.apiRouter.init();
    }
}

module.exports = Initialization;

