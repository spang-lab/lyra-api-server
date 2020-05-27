/* eslint-disable class-methods-use-this */
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const LyraComponent = require('lyra-component');

const fsPromise = fs.promises;
/**
 * File System utility functions
 * @memberof module:Util
 * @class
 */
class FileSystem extends LyraComponent {
    async dirExists(directory) {
        return fs.existsSync(directory);
    }
    /**
     * List all available files and folders in a given directory
     * @param {string} directory - directory to parse
     */
    async listDir(directory) {
        let files = await fsPromise.readdir(directory);
        files = files.map(async (file) => {
            const stat = await fsPromise.stat(path.join(directory, file));
            return {
                name: file,
                stat,
            };
        });
        const stats = await Promise.all(files);
        return stats;
    }
    /**
     * List all available folders in a given directory
     * @param {string} directory - directory to parse
     */
    async listFolders(directory) {
        const stats = await this.listDir(directory);
        const folders = stats
            .filter(file => file.stat.isDirectory())
            .map(file => file.name);
        return folders;
    }

    /**
     * List all available files in a given directory
     * @param {string} directory - directory to parse
     */
    async listFiles(directory) {
        const stats = await this.listDir(directory);
        const files = stats
            .filter(file => file.stat.isFile())
            .map(file => file.name);
        return files;
    }
    /**
     * List all available files in a given directory
     * matching a regular Expression
     * @param {string} directory - directory to parse
     * @param {string} regExp - regular Expression to map
     */
    async findFiles(directory, regExp) {
        const re = new RegExp(regExp);
        const files = await this.listFiles(directory);
        const matches = files
            .filter(file => re.test(file));
        return matches;
    }


    /**
     * get the sha256 hash for a file, if this hash does
     * not change we assume the file did not change
     * @param {string} filePath - the name of the file
     * @param {string} fileName - the path of the file
     */
    async hashFile(filePath, fileName) {
        const fullFilePath = path.join(filePath, fileName);
        const fileStream = fs.createReadStream(fullFilePath);
        const hash = crypto.createHash('sha256');
        hash.setEncoding('hex');

        return new Promise((resolve, reject) => {
            fileStream.on('end', () => {
                hash.end();
                const hashValue = hash.read();
                resolve(hashValue);
            });
            fileStream.on('error', e => reject(e));
            fileStream.pipe(hash);
        });
    }
}
module.exports = FileSystem;

