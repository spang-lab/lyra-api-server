
const LyraComponent = require('lyra-component');

/**
 * Infers api structure from the file system
 * @memberof module:Modules
 * @class
 * @param {Module} fileSystem - fileSystem module
 */
class ApiStructure extends LyraComponent {
    static requires() {
        return {
            fileSystem: 'util.FileSystem',
        };
    }

    /**
     * List all available api paths in a given directory
     * @param {string} directory - directory to parse
     */
    async listDir(directory) {
        return this.fileSystem.listFolders(directory);
    }
}
module.exports = ApiStructure;

