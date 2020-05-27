/* eslint-disable no-await-in-loop */
const LyraComponent = require('lyra-component');


class Tables extends LyraComponent {
    static requires() {
        return {
        };
    }

    async init(db) {
        this.logger.log('Initializing tables...');
        const { tables } = this.config.static;
        // Order is required for tables
        for (let i = 0; i < tables.length; i += 1) {
            const table = tables[i];
            await this.checkTable(db, table);
        }
        this.logger.log('done.');
    }


    async checkTable(db, table) {
        this.logger.verbose(`Checking Table ${table.name}...`);
        const exists = await this.tableExists(db, table);
        if (!exists) {
            this.logger.log(`Table ${table.name} does not exist, creating it...`);
            await this.createTable(db, table);
            this.logger.log('done.');
        }
        this.logger.verbose(`Table ${table.name} ok.`);
    }

    /**
     * check if a table exists in the database
     * @param {database} db - a database connection
     * @param {object} table - the table
     * @param {string} table.name - the table name
     * @param {string} table.schema - the table schema
     * @param {array} table.values - optional values to insert
     */
    async tableExists(db, table) {
        const query = `
            SELECT EXISTS (
            SELECT 1
            FROM   information_schema.tables 
            WHERE  table_name = $(name)
        );`;
        const res = await db.one(query, {
            name: table.name,
        });
        return res.exists;
    }


    async createTable(db, table) {
        switch (table.name) {
        case 'token':
            await db.none(`CREATE TABLE token (
                id              SERIAL              PRIMARY KEY NOT NULL,
                key             CHAR(64)            NOT NULL,
                token           CHAR(12)            NOT NULL UNIQUE,
                type            INTEGER             NOT NULL,
                data            JSON                NOT NULL,
                created         timestamp           NOT NULL,
                lifetime        interval            NOT NULL
            );`);
            return;
        case 'identifier_list':
            await db.none(`CREATE TABLE identifier_list (
                id              BIGSERIAL           PRIMARY KEY NOT NULL,
                name            VARCHAR(32)         NOT NULL,
                type            INTEGER             NOT NULL,
                UNIQUE (name, type)
            );`);
            await db.none('CREATE INDEX trgm_idx ON identifier_list USING GIN (name gin_trgm_ops)');
            return;
        case 'dataset':
            await db.none(`CREATE TABLE dataset (
                id              SERIAL              PRIMARY KEY NOT NULL, 
                name            VARCHAR(64)        NOT NULL UNIQUE,
                display_name    VARCHAR(128)        NOT NULL,
                type            INTEGER             NOT NULL,
                access          INTEGER             NOT NULL,
                description     VARCHAR(2048)       NOT NULL,
                row_id_type     INTEGER             NOT NULL,
                col_id_type     INTEGER             NOT NULL,
                num_rows        INTEGER             NOT NULL,
                num_cols        INTEGER             NOT NULL,
                species         INTEGER             NOT NULL,
                file_name       VARCHAR(256)        NOT NULL UNIQUE,
                hash            CHAR(64)            NOT NULL,
                last_modified   timestamp           NOT NULL
            );`);
            return;
        case 'identifier_data_map':
            await db.none(`CREATE TABLE identifier_data_map (
                id              BIGSERIAL           PRIMARY KEY NOT NULL,
                identifier      BIGINT              NOT NULL REFERENCES identifier_list(id),
                dataset         INTEGER             NOT NULL REFERENCES dataset(id),
                direction       INTEGER             NOT NULL,
                index           BIGINT              NOT NULL,
                UNIQUE (identifier, index, dataset, direction)
            );`);
            await db.none('CREATE INDEX ON identifier_data_map (direction, dataset)');
            return;
        case 'dna_data_map':
            await db.none(`CREATE TABLE dna_data_map (
                id              BIGSERIAL           PRIMARY KEY NOT NULL,
                chromosome      VARCHAR(12)         NOT NULL,
                section         int8range           NOT NULL,
                strand          INTEGER             NOT NULL,
                type            INTEGER             NOT NULL,
                dataset         INTEGER             NOT NULL REFERENCES dataset(id),
                direction       INTEGER             NOT NULL,
                index           BIGINT              NOT NULL,
                UNIQUE (index, direction, dataset) 
            );`);
            return;
        case 'identifier_identifier_map':
            await db.none(`CREATE TABLE identifier_identifier_map (
                id              BIGSERIAL           PRIMARY KEY NOT NULL,
                identifier_1    BIGINT              NOT NULL REFERENCES identifier_list(id),
                identifier_2    BIGINT              NOT NULL REFERENCES identifier_list(id),
                dataset         INTEGER             NOT NULL REFERENCES dataset(id),
                weight          INTEGER             NOT NULL,
                type            INTEGER             NOT NULL, 
                UNIQUE (identifier_1, identifier_2, dataset)
            );`);
            await db.none('CREATE INDEX ON identifier_identifier_map(identifier_1)');
            await db.none('CREATE INDEX ON identifier_identifier_map(identifier_2)');
            return;
        default:
            throw this.customError(
                'TableCreationError',
                `Unable to create table ${table.name}, no SQL statement found`,
            );
        }
    }
}

module.exports = Tables;
