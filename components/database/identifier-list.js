const LyraComponent = require('lyra-component');
const LRUCache = require('lru-cache');


class IdentifierList extends LyraComponent {
    static requires() {
        return {
            helpers: 'database.Helpers',
            converter: 'database.Converter',
        };
    }

    constructor(dependencies) {
        super(dependencies);
        this.cache = new LRUCache({
            max: 100,
        });
    }

    /**
     * Get an Indentifier or add it to the list
     * @param {database} db - active database trasaction, or null
     * @param {object} identifier - the identifier to add
     * @param {string} identifier.name - the name of the identifier
     * @param {integer} identifier.type - the type id of the identifier
     */
    async getOrAdd(db, identifier) {
        const identifiers = this.util.toArray(identifier);
        const promises = identifiers.map(async id => ({
            identifier: id,
            dbEntry: await this.find(db, id),
        }));
        const entries = await Promise.all(promises);
        const results = await this.addMissing(db, entries);
        if (Array.isArray(identifier)) {
            return results;
        }
        return results[0];
    }

    async addMissing(db, entries) {
        const missing = entries
            .filter(entry => !entry.dbEntry)
            .map(entry => entry.identifier);
        if (!missing.length) {
            return entries.map(e => e.dbEntry);
        }
        const newIds = await this.add(db, missing);
        const newIdList = this.util.toArray(newIds);
        const identifiers = entries.map((entry) => {
            if (!entry.dbEntry) {
                return newIdList.shift();
            }
            return entry.dbEntry;
        });
        return identifiers;
    }

    /**
     * Add a new Indentifier to the list
     * @param {database} db - active database trasaction, or null
     * @param {object} identifier - the identifier to add
     * @param {string} identifier.name - the name of the identifier
     * @param {integer} identifier.type - the type id of the identifier
     */
    async add(db, identifier) {
        const identifiers = this.util.toArray(identifier)
            .map(id => this.converter.identifier(id));
        if (!identifiers || !identifiers.length) {
            throw this.customError(
                'IdentifierInsertError',
                `identifiers is ${JSON.stringify(identifiers)}`,
            );
        }
        const pQuery = this.helpers.insert(
            identifiers,
            'identifier_list',
        );
        const query = `${pQuery} RETURNING *`;
        const results = await db.any(query);
        if (!results || !results.length) {
            throw this.customError(
                'IdentifierInsertError',
                `Query ${query} 
                 Results: ${results}`,
            );
        }
        if (results.length === 1) {
            return results[0];
        }
        return results;
    }
    /**
     * Find an identifier by name and type
     * @param {database} db - active database trasaction, or null
     * @param {object} identifier - the identifier to find
     * @param {string} identifier.name - the name of the identifier
     * @param {integer} identifier.type - the type id of the identifier
     */
    async find(db, identifier) {
        const key = this.cacheKey(identifier);
        const id = this.cache.get(key);
        if (id) {
            return {
                ...identifier,
                id,
            };
        }
        const dbIdentifier = this.converter.identifier(identifier);
        const query =
            `SELECT * FROM identifier_list
            WHERE name = $(name)
            AND type = $(type)
            `;
        const result = await db.oneOrNone(query, dbIdentifier);
        if (!result) {
            return null;
        }
        this.cache.set(key, result.id);
        return result;
    }

    async get(db, id) {
        const query =
            `SELECT * from identifier_list
            WHERE id = $(id)
            `;
        return db.one(query, {
            id,
        });
    }

    async deleteOrphans(db) {
        this.clearCache();
        const query = `
            DELETE FROM identifier_list 
            WHERE identifier_list.id IN 
            (
                SELECT 
                   il.id
                FROM identifier_list il
                LEFT OUTER JOIN identifier_data_map idm
                   ON idm.identifier = il.id
                LEFT OUTER JOIN identifier_identifier_map iim
                   ON iim.identifier_1 = il.id
                   OR iim.identifier_2 = il.id
                WHERE idm.id Is Null
                AND iim.id Is Null
            )
            `;
        return db.any(query);
    }


    cacheKey(identifier) {
        const dbIdentifier = this.converter.identifier(identifier);
        const key = `${dbIdentifier.name}:${dbIdentifier.type}`;
        return key;
    }

    clearCache() {
        this.cache.reset();
    }
}

module.exports = IdentifierList;

