const LyraComponent = require('lyra-component');
/**
 * Database utility functions
 * @memberof module:Database
 * @class
 */
class Util extends LyraComponent {
    static requires() {
        return {
            connection: 'database.Connection',
        };
    }


    /**
     * Create a new postgres transaction
     * @param {function(task:Object)} content
     * - all db queries in this function are part of the transaction
     */
    async transaction(content, existingTask) {
        if (existingTask) {
            this.logger.log('Reusing existing transaction.');
            return content(existingTask);
        }
        this.logger.log('Creating new transaction.');
        const db = this.connection.get();
        const result = await db.tx(t => content(t));
        this.logger.log('Transaction complete');
        return result;
    }
}
module.exports = Util;
