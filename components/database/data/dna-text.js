/* eslint-disable no-await-in-loop */
const LyraComponent = require('lyra-component');

class DnaTextTable extends LyraComponent {
    static requires() {
        return {
            converter: 'database.Converter',
            helpers: 'database.Helpers',
        };
    }

    /**
     * Create a new table to store matrix data
     * @param {Database} db - an active database transaction, or null
     *                          if this call is not part of a transaction
     * @param {object} dataset - the dataset id
     */
    async create(db, dataset) {
        const query =
            `CREATE TABLE dataset_$(id#) (
                row_index BIGINT NOT NULL,
                col_index BIGINT NOT NULL,
                value VARCHAR(128),
                PRIMARY KEY (row_index, col_index)
            )`;
        await db.none(query, {
            id: dataset.id,
        });
        const indexQuery =
            'CREATE INDEX ON dataset_$(id#)(col_index)';
        await db.none(indexQuery, {
            id: dataset.id,
        });
        this.logger.log('Created dna text table.');
    }

    /**
     * add values to the data table
     * @param {database} db - transaction
     * @param {object} dataset - the the dataset
     * @param {integer} dataset.id - the id of the dataset
     * @param {Array<Object> or Object} - the value(s) to add
     */
    async add(db, dataset, value) {
        const values = this.util.toArray(value);
        if (!values || !values.length) {
            throw this.customError(
                'DataInsertError',
                `Values is ${JSON.stringify(values)}`,
            );
        }
        const query = this.helpers.insert(
            values,
            'dna_text_data',
            dataset,
        );
        await db.none(query);
    }
    /**
     * get a row or column from the table
     * @param {database} db - transaction
     * @param {Object}   mapping - the mapping information
     */
    async get(db, mapping) {
        const mappings = this.util.toArray(mapping);
        const dbMappings = mappings.map(m =>
            this.converter.data(m));
        const query =
            `SELECT
                ilt.*,
                $(rIndex#) AS index,
                dt.value
            FROM dataset_$(dataset#) dt
            LEFT OUTER JOIN identifier_data_map as idt
                ON (
                    idt.index = dt.$(rIndex#) AND
                    idt.direction = $(rDirection)  AND
                    idt.dataset = $(dataset)
                )
            LEFT OUTER JOIN identifier_list as ilt
                ON ilt.id = idt.identifier
            WHERE $(fIndex#) = $(index)
            `;
        const promises = dbMappings.map(async (m) => {
            const results = await db.any(query, m);
            return results
                .map(id => this.converter.identifier(id, true))
                .map(e => this.converter.index(e, m));
        });
        const results = await Promise.all(promises);
        return results;
    }

    /**
     * get rows matching a certain column value
     * @param {database} db - transaction
     * @param {Object}   mapping - the mapping information
     * @param {integer}  mapping.dataset - the dataset id
     * @param {integer}  mapping.column - the column to search
     * @param {integer}  mapping.value - the value to search for
     */
    async getColumnMatches(db, mapping) {
        const query =
            `SELECT row_index FROM $(dataTableName#)
             WHERE $(column#) = $(value)
            `;
        const data = await db.any(query, {
            dataTableName: this.dbutil.getDataTable(mapping.dataset),
            column: mapping.column,
            value: mapping.value,
        });
        return data;
    }

    /**
     * get raw row data
     * @param {database} db - transaction
     * @param {Object}   mapping - the mapping information
     * @param {integer}  mapping.dataset - the dataset id
     * @param {integer}  mapping.index - the index of the row or column
     */
    async getRow(db, mapping) {
        const query =
            `SELECT * FROM $(dataTableName#)
                WHERE row_index = $(index)
            `;
        const data = await db.any(query, {
            dataTableName: this.dbutil.getDataTable(mapping.dataset),
            index: mapping.index,
        });
        return data;
    }


    async process() {
        this.logger.log('no processing required.');
    }
}

module.exports = DnaTextTable;

