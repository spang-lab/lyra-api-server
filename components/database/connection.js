/**
 *   library that handles connecting to a postgres database
 */
const PgPromise = require('pg-promise');
const LyraComponent = require('lyra-component');
/**
 * Database connection primitive
 * @memberof module:Database
 * @class
 */
class Connection extends LyraComponent {
    static requires() {
        return {
        };
    }

    /**
     * try to connect to the database
     * this does not check for an actual connection,
     * but creates a connection pool.
     * The library lazyly checks for a valid connection
     * when the first query comes in
     */
    connect() {
        const dbConfig = this.config.database;
        const { secrets } = this.config;
        const initOptions = {};
        if (this.config.debug) {
            initOptions.query = (ev) => {
                this.logger.log(`QUERY:
                    ${ev.query}`);
            };
            initOptions.receive = (data) => {
                this.logger.log(`Recieved ${data.length} rows`);
            };
        }
        this.logger.log('Initializing Database connection...');
        this.pgp = PgPromise(initOptions);
        const connection = {
            host: dbConfig.host,
            port: dbConfig.port,
            database: dbConfig.name,
            user: secrets.postgresUser,
            password: secrets.postgresPassword,
        };
        this.logger.log(`Host: ${connection.host}`);
        this.logger.log(`Port: ${connection.port}`);
        this.logger.log(`Database: ${connection.database}`);
        this.db = this.pgp(connection);
    }

    /**
     * end the database connection
     */
    terminate() {
        if (this.pgp) {
            this.pgp.end();
        }
    }

    /**
     * obtain a database connection to call queries on.
     * in reality you get the whole connection pool and\
     * pg-promise handles the lower level
     */
    get() {
        if (!this.db) {
            throw new Error(`Trying to obtain a connection before the database
                has been initalized.`);
        }
        return this.db;
    }

    /**
     * return a reference to the initalized database
     * useful for helper functions of the pg-promise library
     */
    getPgp() {
        return this.pgp;
    }

    /**
     * send a dummy query to see if the database is ready
     */
    async ready() {
        return this.get().connect();
    }
}
module.exports = Connection;
