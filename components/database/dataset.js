const LyraComponent = require('lyra-component');
/**
 * Responsible for managing datasets
 * @memberof module:Database
 * @class
 * @param {Module} connection - the database connection
 * @param {Module} logger - logger module
 * @param {Module} customError - customError module
 */
class Dataset extends LyraComponent {
    static requires() {
        return {
            helpers: 'database.Helpers',
            converter: 'database.Converter',
        };
    }

    /**
     * find datasets matching conditions
     * @param {database} task - a database transaction, or null
     * @param {object} conditions - object containing the column
     *                              names as keys and the desired
     *                              value as values
     */
    async findBy(db, conditions = {}) {
        const set = this.helpers.where(conditions);
        const query =
            `SELECT * FROM dataset WHERE 
             ${set}
            `;
        return db.any(query, {
            set,
        });
    }

    async add(db, dataset) {
        const dbDataset = this.converter.dataset(dataset);
        const insertQuery = this.helpers.insert(
            dbDataset,
            'dataset',
        );
        const query = `${insertQuery} RETURNING *`;
        const result = await db.one(query);
        return this.converter.dataset(result, true);
    }

    /**
     * Find a dataset by name
     * @param {pgp-task} task - database connection to use, if null obtain a
     *                          new database connection. This is used for transactions
     *                          that have to be run on a single connection
     * @param {string} name - the name of the dataset to search
     */
    async find(db, name) {
        const query =
            `SELECT * FROM dataset
            WHERE name = $(name)
            `;
        return db.oneOrNone(query, {
            name,
        });
    }
    /**
     * Find a dataset by its id
     * @param {pgp-task} task - database connection to use, if null obtain a
     *                          new database connection. This is used for transactions
     *                          that have to be run on a single connection
     * @param {integer} id - the id of the dataset to search
     */
    async get(task, id) {
        const db = task || this.connection.get();
        const query =
            `SELECT * FROM dataset
            WHERE id = $(id)
            `;
        return db.oneOrNone(query, {
            id,
        });
    }
    /**
     * List all available datasets
     * @param {pgp-task} task - database connection to use, if null obtain a
     *                          new database connection. This is used for transactions
     *                          that have to be run on a single connection
     */
    async list(db) {
        const query =
            `SELECT *
             FROM dataset`;
        return db.any(query);
    }

    /**
     * Delete a dataset entry
     * @param {object} dataset - the dataset to delete
     * @param {integer} dataset.id - the id of the dataset
     */
    async delete(db, dataset) {
        const query =
            `DELETE from dataset
            WHERE id= $(id)
            `;
        return db.none(query, {
            id: dataset.id,
        });
    }
}
module.exports = Dataset;
