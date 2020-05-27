/* eslint-disable no-restricted-syntax, no-await-in-loop, no-continue */
const semver = require('semver');
const LyraComponent = require('lyra-component');
/**
 * Database patching module
 * contains one time updates for the database
 * @memberof module:Database
 * @class
 * @param {Module} logger - the logger
 * @param {Module} version - the database version module
 */
class Patcher extends LyraComponent {
    static requires() {
        return {
            version: 'database.Version',
        };
    }

    /**
     * check if the database need to be patched
     */
    async init(task) {
        const versions = this.getPatches().map(p => p.version);
        const latestVersion = versions.pop();
        const versionExists = await this.version.versionExists(task);
        if (!versionExists) {
            this.logger.log('no version information found, assuming latest Version');
            await this.version.setVersion(task, latestVersion);
        }
        const databaseVersion = await this.version.getVersion(task);
        this.logger.log(`database Version: ${databaseVersion}`);
        this.logger.log(`latest Version: ${latestVersion}`);
        if (!semver.valid(latestVersion)) {
            this.logger.error(`invalid version number ${latestVersion}. Aborting.`);
            return false;
        }
        if (!semver.valid(databaseVersion)) {
            this.logger.error(`invalid version number ${databaseVersion}. Aborting.`);
            this.logger.warn('assuming latest Version');
            await this.version.setVersion(task, latestVersion);
            return false;
        }
        if (semver.gt(databaseVersion, latestVersion)) {
            this.logger.error('database version is ahead of server. Aborting.');
            return false;
        }
        if (semver.lt(databaseVersion, latestVersion)) {
            this.logger.warn('database version is behind server. Applying patches...');
            return this.patch(task, latestVersion, databaseVersion);
        }
        this.logger.log('database is up to date');
        return false;
    }
    /**
     * update the database
     */
    async patch(task, currentVersion, databaseVersion) {
        const patches = await this.getPatches();
        // we need to wait for one patch to be done before applying the next
        for (const patch of patches) {
            if (!semver.valid(patch.version)) {
                this.logger.error(`skipping invalid patch version ${patch.version}`);
                continue;
            }
            if (semver.gte(databaseVersion, patch.version)) {
                // the patch was already applied
                continue;
            }
            this.logger.warn(`Applying patch ${patch.version}...`);
            await patch.func(task);
            await this.version.setVersion(task, patch.version);
            this.logger.warn('Patch complete');
            this.logger.warn('reinitializing database...');
            return true;
        }
        return false;
    }
    /**
     * returns a list of patches
     */
    getPatches() {
        const patches = [
            {
                version: '1.0.0',
                func: async () => {
                    this.logger.error('This should never happen');
                },
            },
            {
                version: '1.0.1',
                func: async () => {
                    // change things in the database here
                    this.logger.log('Test patch please ignore');
                },
            },
            {
                version: '1.0.2',
                func: async (db) => {
                    this.logger.log('Adding missing index');
                    await db.none('CREATE INDEX ON identifier_data_map (direction, dataset)');
                    this.logger.log('done.');
                },
            },
            {
                version: '1.0.3',
                func: async (db) => {
                    this.logger.log('Adding missing index');
                    await db.none('CREATE INDEX ON identifier_data_map (dataset, direction, index)');
                    this.logger.log('done.');
                },
            },
        ];
        return patches;
    }
}
module.exports = Patcher;

