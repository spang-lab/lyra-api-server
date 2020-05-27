/* eslint-disable class-methods-use-this */
const fetch = require('node-fetch');
const LyraComponent = require('lyra-component');

class Https extends LyraComponent {
    static requires() {
        return {
            connection: 'database.Connection',
            token: 'database.Token',
        };
    }

    async cacheLookup(key) {
        this.logger.verbose(`Looking up key ${key}`);
        const db = this.connection.get();
        const token = {
            key,
            type: 'https',
        };
        const result = await this.token.get(db, token);
        if (!result || !result.data) {
            this.logger.verbose(`no match for key ${key}`);
            return null;
        }
        this.logger.verbose(`Cache hit for key ${key}`);
        return result.data;
    }


    async writeCache(key, result) {
        const db = this.connection.get();
        const token = {
            type: 'https',
            data: result,
            key,
            lifetime: '1d',
        };
        await this.token.add(db, token);
    }


    convertPath(host, path) {
        if (!path || !path.length) {
            throw new Error('Invalid empty path');
        }
        let fullPath = `${host}${path}`;
        if (path[0] !== '/') {
            fullPath = `${host}/${path}`;
        }
        return fullPath;
    }

    encodeQueryData(data) {
        return Object.keys(data).map(key =>
            [key, data[key]]
                .map(encodeURIComponent)
                .join('=')).join('&');
    }

    async get(host, path, queryData) {
        let fullPath = this.convertPath(host, path);
        if (queryData) {
            const queryString = this.encodeQueryData(queryData);
            fullPath = `${fullPath}?${queryString}`;
        }
        const cacheHit = await this.cacheLookup(fullPath);
        if (cacheHit) {
            return cacheHit;
        }
        this.logger.log(`External Request: ${fullPath}`);
        const result = await fetch(fullPath);
        const parsed = await result.json();
        await this.writeCache(fullPath, parsed);
        return parsed;
    }
}
module.exports = Https;
