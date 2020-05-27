const LyraComponent = require('lyra-component');

class IdentifierDataMap extends LyraComponent {
    static requires() {
        return {
            helpers: 'database.Helpers',
            converter: 'database.Converter',
        };
    }

    /**
     * Add a new mapping from an identifier to data
     * @param {database} db - an active database transaction, or null
     * @param {object} mapping - the mapping to add
     * @param {integer} mapping.identifier - the id of the identifier, from identifierList
     * @param {integer} mapping.dataset - the id of the dataset
     * @param {string} direction - row or column
     * @param {integer} index - the index
     */
    async add(db, mapping) {
        const mappings = this.util.toArray(mapping)
            .map(m => this.converter.dataMapping(m));
        if (!mappings.length) {
            throw this.customError(
                'NoDataMappingError',
                `mappings is ${mappings}`,
            );
        }
        const query = this.helpers.insert(
            mappings,
            'identifier_data_map',
        );
        return db.none(query);
    }
    /**
     * Get data mappings for and identifier
     * @param {database} db - database transaction or null
     * @param {object} pair - id dataset pair
     * @param {object} pair.identifier - the id of an identifier
     * @param {object} pair.dataset - the id of a dataset
     * @param {integer} pair.direction - the target direction
     */
    async get(db, pair, multiple = false) {
        const pairs = this.util.toArray(pair);

        const query =
            `SELECT * from identifier_data_map
             WHERE identifier = $(identifier)
             AND dataset = $(dataset)
             AND direction = $(direction)
            `;
        const promises = pairs.map(async p =>
            db.any(query, {
                identifier: p.identifier.id,
                dataset: p.dataset.id,
                direction: p.direction,
            }));
        const results = await Promise.all(promises);
        if (multiple) {
            return results;
        }
        return results.map(m => this.util.toSingle(m));
    }

    async reverseLookup(db, mapping) {
        const mappings = this.util.toArray(mapping);
        const query =
            `SELECT
                il.*
             FROM identifier_data_map idm
             INNER JOIN identifier_list il
                ON idm.identifier = il.id
             WHERE idm.dataset = $(dataset)
             AND   idm.index = $(index)
             AND   idm.direction = $(direction)
            `;
        const promises = mappings.map(async m => db.any(query, m));
        const results = await Promise.all(promises);
        const identifiers = results.map(idList =>
            idList.map(id => this.converter.identifier(id, true)));
        return this.util.toOriginal(identifiers, mapping);
    }


    /**
     * Delete all mappings from a certain dataset
     * @param {database} db - an active database transaction, or null
     * @param {object} dataset - the dataset to delete
     * @param {integer} dataset.id - the id of the dataset
     */
    async deleteDataset(db, dataset) {
        const query =
            `DELETE from identifier_data_map
            WHERE dataset = $(id)
            `;
        return db.none(query, {
            id: dataset.id,
        });
    }
}

module.exports = IdentifierDataMap;

