const LyraComponent = require('lyra-component');

class PlotTable extends LyraComponent {
    static requires() {
        return {
            converter: 'database.Converter',
            helpers: 'database.Helpers',
        };
    }
    /**
     * Create a new table to store plot data
     * @param {Database} db - an active database transaction, or null
     *                          if this call is not part of a transaction
     * @param {object} dataset - the dataset id
     */
    async create(db, dataset) {
        const query =
            `CREATE TABLE dataset_$(id#) (
                id SERIAL PRIMARY KEY NOT NULL,
                name VARCHAR(256) UNIQUE NOT NULL,
                data JSON NOT NULL
            )`;
        await db.none(query, {
            id: dataset.id,
        });
        this.logger.log('Created plot table.');
    }

    /**
     * add values to the data table
     * @param {database} db
     * @param {integer} dataset - the id of the dataset
     * @param {Array<Object> or Object} - the value(s) to add
     */
    async add(db, dataset, value) {
        const values = this.util.toArray(value);
        const query = this.helpers.insert(
            values,
            'plot_data',
            dataset,
        );
        await db.none(query);
    }

    /**
     * get a plot from the table
     * @param {database} db - transaction
     * @param {Object}   mapping - the mapping information
     * @param {integer}  mapping.dataset - the dataset id
     * @param {string}   mapping.name - the name of the plot
     */
    async get(db, mapping) {
        const query = `
            SELECT * from dataset_$(id#)
            WHERE name = $(name)
            `;
        return db.oneOrNone(query, {
            id: mapping.dataset,
            name: mapping.name,
        });
    }
}

module.exports = PlotTable;

