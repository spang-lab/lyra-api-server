const LyraComponent = require('lyra-component');

class PhenoTable extends LyraComponent {
    static requires() {
        return {
            helpers: 'database.Helpers',
            converter: 'database.Converter',
        };
    }

    /**
     * Create a new table to store matrix data
     * @param {Database} db - an active database transaction, or null
     *                          if this call is not part of a transaction
     * @param {object} dataset - the dataset id
     */
    async create(db, dataset) {
        this.logger.log('Creating table...');
        const query = `
            CREATE TABLE dataset_$(id#) (
                row_index BIGINT NOT NULL,
                col_index BIGINT NOT NULL,
                value VARCHAR(256),
                PRIMARY KEY (row_index, col_index)
            )`;
        await db.none(query, {
            id: dataset.id,
        });
        const indexQuery = 'CREATE INDEX ON dataset_$(id#)(col_index)';
        await db.none(indexQuery, {
            id: dataset.id,
        });
        this.logger.log('Created pheno table.');
    }

    /**
     * add values to the data table
     * @param {database} db
     * @param {object} dataset - the dataset
     * @param {number} dataset.id - the id of the dataset
     * @param {Array<Object> or Object} - the value(s) to add
     */
    async add(db, dataset, value) {
        const values = this.util.toArray(value);
        if (!values || !values.length) {
            throw this.customError(
                'DataInsertError',
                `Values is ${values}`,
            );
        }
        const query = this.helpers.insert(
            values,
            'pheno_data',
            dataset,
        );
        await db.none(query);
    }

    /**
     * get a row or column from the table
     * @param {database} db - transaction
     * @param {object}   mapping - the mapping information
     */
    async get(db, mapping) {
        const mappings = this.util.toArray(mapping);
        const dbMappings = mappings.map(m => this.converter.data(m));
        const query = `
            SELECT
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
            if (!m) {
                return null;
            }
            const results = await db.any(query, m);
            return results
                .map(id => this.converter.identifier(id, true))
                .map(e => this.converter.index(e, m));
        });
        const results = await Promise.all(promises);
        return results;
    }
}

module.exports = PhenoTable;
