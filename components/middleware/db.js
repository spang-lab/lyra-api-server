
const LyraComponent = require('lyra-component');


class Db extends LyraComponent {
    static requires() {
        return {
            connection: 'database.Connection',
        };
    }

    // add a database connection to the request
    get() {
        return async (ctx, next) => {
            ctx.state.db = this.connection.get();
            await next();
        };
    }
}

module.exports = Db;

