const LyraComponent = require('lyra-component');

class IdentifierIdentifierMap extends LyraComponent {
    static requires() {
        return {
            converter: 'database.Converter',
            helpers: 'database.Helpers',
        };
    }

    /**
     * Add a new mapping from identifier to identifier
     * @param {database} db - an active database transaction, or null
     * @param {object} mapping - the mapping to add
     * @param {integer} mapping.identifier_1 - the id of the first identifier, from identifierList
     * @param {integer} mapping.identifier_2 - the id of the second identifier
     * @param {integer} mapping.dataset - the id of the dataset
     * @param {integer} mapping.weight - the weight of the connection, optional
     * @param {integer} mapping.type - the type of the connection, optional
     */
    async add(db, mapping) {
        const mappings = this.util.toArray(mapping);
        const dbMappings = mappings.map(m => this.converter.idMapping(m));
        const query = this.helpers.insert(
            dbMappings,
            'identifier_identifier_map',
        );
        await db.none(query);
    }
    /**
     * Delete all mappings from a certain dataset
     * @param {object} dataset - the dataset to delete
     * @param {integer} dataset.id - the id of the dataset
     */
    async deleteDataset(db, dataset) {
        const query =
            `DELETE from identifier_identifier_map
            WHERE dataset = $(id)
            `;
        return db.none(query, {
            id: dataset.id,
        });
    }

    /**
     * Get all interactions from or to a certain id
     * @param {database} db - an active database transaction, or null
     * @param {integer} id - the id to get
     * @param {integer} dataset - the id of the dataset
     */
    async get(db, id, dataset) {
        const query =
            `SELECT
                $(idMapTableName#).*,
                join1.name AS name_1,
                join1.type AS type_1,
                join2.name AS name_2,
                join2.type AS type_2
            FROM $(idMapTableName#)
            INNER JOIN $(idListTableName#) AS join1
            ON ($(idMapTableName#).identifier_1 = join1.id)
            INNER JOIN $(idListTableName#) AS join2
            ON ($(idMapTableName#).identifier_2 = join2.id)
            WHERE $(idMapTableName#).identifier_1 = $(id)
            OR    $(idMapTableName#).identifier_2 = $(id)
            AND   dataset = $(dataset)
            `;
        return db.any(query, {
            idMapTableName: this.dbutil.getTableName('IDENTIFIER_IDENTIFIER_MAP'),
            idListTableName: this.dbutil.getTableName('IDENTIFIER_LIST'),
            id,
            dataset,
        });
    }
}

module.exports = IdentifierIdentifierMap;

