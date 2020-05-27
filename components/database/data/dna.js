/* eslint-disable no-await-in-loop */
const LyraComponent = require('lyra-component');

class DnaTable extends LyraComponent {
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
        const query = `
            CREATE TABLE dataset_$(id#) (
                row_index BIGINT NOT NULL,
                col_index BIGINT NOT NULL,
                value REAL,
                row_rank BIGINT,
                col_rank BIGINT,
                PRIMARY KEY (row_index, col_index)
            )`;
        await db.none(query, {
            id: dataset.id,
        });
        const indexQuery = 'CREATE INDEX ON dataset_$(id#)(col_index)';
        await db.none(indexQuery, {
            id: dataset.id,
        });
        this.logger.log('Created dna table.');
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
            'dna_data',
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
        const dbMappings = mappings.map(m => this.converter.data(m));
        const query = `
            SELECT
                ilt.*,
                $(rIndex#) AS index,
                dt.value,
                dt.row_rank,
                dt.col_rank
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
        return this.util.toOriginal(results, mapping);
    }

    /**
     * calculate the row and col ranks in the dataset
     * @param {object} dataset - the dataset
     * @param {integer} dataset.id - the id of the dataset
     * @param {integer} dataset.numRows - the number of rows
     * @param {integer} dataset.numCols - the number of cols
     */
    async process(db, dataset) {
        this.logger.log('calculating row ranks...');
        for (let row = 0; row < dataset.numRows; row += 1) {
            const query = `
                UPDATE dataset_$(id#)
                SET row_rank = r.rank
                FROM (SELECT
                        col_index,
                        row_number() OVER (ORDER BY value DESC) as rank
                      FROM dataset_$(id#)
                      WHERE row_index = $(currentRow)
                     ) r
                WHERE dataset_$(id#).row_index = $(currentRow)
                AND   dataset_$(id#).col_index = r.col_index
                `;
            await db.none(query, {
                id: dataset.id,
                currentRow: row,
            });
            this.logger.logProgress(row, dataset.numRows);
        }
        this.logger.log('row_ranks done.');
        this.logger.log('calculating col_ranks.');
        for (let col = 0; col < dataset.numCols; col += 1) {
            const query = `
                UPDATE dataset_$(id#)
                SET col_rank = r.rank
                FROM (SELECT
                        row_index,
                        row_number() OVER (ORDER BY value DESC) as rank
                      FROM dataset_$(id#)
                      WHERE col_index = $(currentCol)
                     ) r
                WHERE dataset_$(id#).row_index = r.row_index
                AND   dataset_$(id#).col_index = $(currentCol)
                `;
            await db.none(query, {
                id: dataset.id,
                currentCol: col,
            });
            this.logger.logProgress(col, dataset.numCols);
        }
        this.logger.log('col_ranks done.');
    }
}

module.exports = DnaTable;
