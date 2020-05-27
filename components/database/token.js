/* eslint-disable class-methods-use-this */
const crypto = require('crypto');
const LyraComponent = require('lyra-component');


/**
 * Handle storing temporary data in a token store
 * @memberof module:Database
 * @class
 */
class Token extends LyraComponent {
    static requires() {
        return {
            converter: 'database.Converter',
            helpers: 'database.Helpers',
        };
    }

    /**
     * create a url safe base 64 encoded random token
     * @param {number} length - length of the token
     */
    generateTokenString(length) {
        const bitsPerChar = 6;
        const bitsPerByte = 8;
        const bytesNeeded = Math.ceil((length * bitsPerChar) / bitsPerByte);
        const bytes = crypto.randomBytes(bytesNeeded);
        const token = bytes.toString('base64').substr(0, length);
        const urlSafeToken = token
            .replace(/\//g, '_')
            .replace(/\+/g, '-');
        return urlSafeToken;
    }


    /**
     * create a hash of and key
     * @param {object} key - key to access the token, any type.
     */
    generateKeyHash(key) {
        const json = JSON.stringify(key);
        const hash = crypto.createHash('sha256');
        hash.update(json);
        return hash.digest('base64');
    }

    /**
     * add a token to the table
     * @param {database} db - a database connection
     * @param {object} token - the token object
     * @param {string} token.data - the data to save
     * @param {string} key - a lookup key
     * @param {string} type - the token type
     * @param {string} lifetime - the token lifetime, e.g '1d'
     */
    async add(db, token) {
        const tokens = this.util.toArray(token);
        const dbTokens = tokens
            .map(t => this.converter.token(t))
            .map(t => ({
                ...t,
                key: this.generateKeyHash(t.key),
                token: this.generateTokenString(12),
                data: JSON.stringify(t.data),
            }));
        const pQuery = this.helpers.insert(
            dbTokens,
            'token',
        );
        const query = `${pQuery} RETURNING token, data`;
        return db.one(query);
    }

    async deleteOldTokens(db) {
        this.logger.verbose('Clearing old tokens.');
        const query = `
            DELETE FROM token
            WHERE
                created < NOW() - lifetime
        `;
        return db.none(query);
    }

    /**
     * get token data from the database
     * @param {database} db - the database connection
     * @param {object} token - the token object
     * @param {string} token.type - the token type
     * @param {string} token.token - (optional) the token string
     * @param {string} token.key - (optional) the token key
     */
    async get(db, token) {
        await this.deleteOldTokens(db);
        const dbToken = this.converter.token(token);
        if (dbToken.token) {
            return this.getToken(db, dbToken);
        }
        dbToken.key = this.generateKeyHash(dbToken.key);
        return this.getKey(db, dbToken);
    }

    async getToken(db, token) {
        const query = `
            SELECT
                token,
                data
            FROM token
            WHERE
                type = $(type) AND
                token = $(token)
        `;
        return db.oneOrNone(query, token);
    }

    async getKey(db, token) {
        const query = `
            SELECT
                token,
                data
            FROM token
            WHERE
                type = $(type) AND
                key = $(key)
        `;
        const data = await db.any(query, token);
        return data[0];
    }
}

module.exports = Token;
