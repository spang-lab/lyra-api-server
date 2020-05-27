/* eslint-disable no-useless-escape */
const LyraComponent = require('lyra-component');

class IdentifierSearch extends LyraComponent {
    static requires() {
        return {
            converter: 'database.Converter',
            helpers: 'database.Helpers',
        };
    }

    /**
     * find identifier by some property
     * @param {database} db - an active database connection
     * @param {object} identifier - the query object or list of query objects
     * @param {string} identifier.name - (optional) the name to find
     * @param {string} identifier.type - (optional) the type to find
     * @param {number} identifier.id   - (optional) the id to find
     * @param {object} options - search options
     */
    async find(db, identifier, options) {
        const sOptions = options || {
            exact: false,
            limit: 10,
        };
        const identifiers = this.util.toArray(identifier);
        const promises = identifiers
            .map(q => this.converter.identifier(q))
            .map(async id => ({
                query: id,
                result: await this.findSingle(db, id, sOptions),
            }));
        const results = await Promise.all(promises);
        return results;
    }

    async findSingle(db, identifier, options) {
        const { id, name, type } = identifier;
        const { exact, limit } = options;
        let query;
        if (id) {
            query = `
                SELECT * FROM identifier_list
                WHERE
                    id = $(id)
            `;
            return db.one(query, identifier);
        }
        if (name && type && exact) {
            query = `
                SELECT * FROM identifier_list
                WHERE
                    name = $(name) AND
                    type = $(type)
            `;
            return db.any(query, identifier);
        }
        if (name && type && !exact && limit) {
            query = `
                SELECT 
                    il.*,
                    similarity(il.name, $(name)) AS sml
                FROM identifier_list il
                WHERE
                    name ILIKE \'%$(name#)%\' AND
                    type = $(type)
                ORDER BY sml DESC, il.name
                LIMIT $(limit#)
            `;
            return db.any(query, {
                ...identifier,
                limit,
            });
        }
        if (name && !type && !exact && limit) {
            query = `
                SELECT 
                    il.*,
                    similarity(il.name, $(name)) AS sml
                FROM identifier_list il
                WHERE
                    name ILIKE \'%$(name#)%\'
                ORDER BY sml DESC, il.name
                LIMIT $(limit#)
            `;
            return db.any(query, {
                ...identifier,
                limit,
            });
        }
        if (name && !type && exact) {
            query = `
                SELECT * FROM identifier_list
                WHERE
                    name = $(name)
            `;
            return db.any(query, identifier);
        }
        throw this.customError(
            'InvalidSearchError',
            `Search with query ${JSON.stringify(identifier)} and 
                         options ${JSON.stringify(options)} is invalid`,
        );
    }
}
module.exports = IdentifierSearch;
