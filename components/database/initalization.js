/* eslint-disable no-await-in-loop */
const LyraComponent = require('lyra-component');
/**
 * Responsible for checking database health and initializing
 * the database if necessary.
 * @memberof module:Database
 * @class
 * @param {Module} connection - the database connection
 * @param {Module} dbutil - database utility functions
 * @param {Module} logger - logger module
 * @param {Module} eventBus - eventBus module
 * @param {Module} user - the database user module
 * @param {Module} token - the database token module
 */
class Initialization extends LyraComponent {
    static requires() {
        return {
            connection: 'database.Connection',
            dbutil: 'database.Util',
            tables: 'database.Tables',
            patcher: 'database.Patcher',
        };
    }

    async init() {
        this.connection.connect();
        let ready = await this.ready();
        while (!ready) {
            await this.util.delay(5000);
            ready = await this.ready();
            this.logger.log('database is not ready, trying again');
        }
        this.logger.log('database is ready');
        await this.check();
    }

    async ready() {
        this.logger.log('Checking if the database is ready');
        try {
            const db = this.connection.get();
            const client = await db.connect();
            client.done();
            return true;
        } catch (err) {
            return false;
        }
    }

    /**
     * initialisation check on db startup
     */
    async check() {
        this.logger.log('Checking if the database is healthy...');
        let checkRequired = true;
        await this.dbutil.transaction(async (task) => {
            while (checkRequired) {
                checkRequired = await this.initSubmodules(task);
            }
        });
        this.logger.log('database is healthy');
    }

    async initSubmodules(task) {
        await this.tables.init(task);
        return this.patcher.init(task);
    }
}
module.exports = Initialization;
