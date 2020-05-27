/* eslint-disable no-restricted-syntax, no-await-in-loop */
const path = require('path');
const LyraComponent = require('lyra-component');


/**
 * Handles database inserts
 * @memberof module:Modules
 * @class
 * @param {Module} config - Config module dependency
 * @param {Module} logger - logger module dependency
 */
class Inserter extends LyraComponent {
    static requires() {
        return {
            fileSystem: 'util.FileSystem',
            dataset: 'database.Dataset',
            rootParser: 'module.parser.RootParser',
            deleter: 'database.data.Deleter',
            dbutil: 'database.Util',
        };
    }

    async check(options) {
        if (this.checkInProgress) {
            this.logger.warn('Insert already in progress. Ignoring.');
            return;
        }
        this.checkInProgress = true;
        try {
            await this.scan(options);
        } catch (e) {
            this.logger.error(`Error scanning data directory: ${e}`);
        }
        this.checkInProgress = false;
    }

    async getActions(options) {
        this.logger.log('Checking for new or changed data');
        const relativePath = this.config.server.dataPath;
        const absPath = path.join(this.config.rootPath, relativePath);
        const files = await this.fileSystem.findFiles(absPath, '.tar.gz$');
        return this.dbutil.transaction(async (db) => {
            const promises = files.map(async (fileName) => {
                const hash = await this.fileSystem.hashFile(absPath, fileName);
                const dbentries = await this.dataset.findBy(db, {
                    file_name: fileName,
                });
                if (!dbentries || !dbentries.length) {
                    return {
                        name: fileName,
                        hash,
                        type: 'new',
                    };
                }
                const [dbentry] = dbentries;
                if (dbentry.hash !== hash) {
                    return {
                        name: fileName,
                        hash,
                        dbentry,
                        type: 'update',
                    };
                }
                return {
                    name: fileName,
                    type: 'noop',
                };
            });
            const queue = await Promise.all(promises);
            const actions = queue
                .filter(file => file.type !== 'noop')
                .map(file => ({
                    ...file,
                    path: absPath,
                    fullPath: path.join(absPath, file.name),
                    dryRun: options.dryRun || false,
                    deleteOrphans: options.deleteOrphans || false,
                }));
            return actions;
        });
    }


    async handleFile(file) {
        this.logger.logBig(`${file.type} file ${file.name}`);
        await this.dbutil.transaction(async (db) => {
            if (file.type === 'update') {
                await this.deleter.delete(db, file);
            }
            await this.rootParser.read(db, file);
            this.logger.logBigSuccess('INSERT SUCCESSFUL');
        });
    }
    /**
     * scan the data folder and look for new and changed datasets
     * @param {boolean} dryRun - if true do not modify the database
     */
    async scan(options) {
        const actions = await this.getActions(options);
        for (const file of actions) {
            try {
                await this.handleFile(file);
            } catch (e) {
                switch (e.name) {
                case 'DryRunError':
                    this.logger.warn('DryRun: Rolling back database');
                    this.logger.logBigSuccess('Dry Run Success');
                    break;
                default:
                    this.logger.error(`Error inserting from ${file.name}:
                        ${e.stack.toString()}
                    `);
                    this.logger.logBig('INSERT FAILED');
                }
            }
        }
    }
}
module.exports = Inserter;

