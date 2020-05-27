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
            enums: 'util.Enums',
            constants: 'util.Constants',
        };
    }

    async init() {
        await this.enums.init();
        await this.constants.init();
    }
}
module.exports = Initialization;
