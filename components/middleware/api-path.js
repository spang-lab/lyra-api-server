const path = require('path');
const LyraComponent = require('lyra-component');

/**
 * Middleware for creating 404 errors on invalid routes
 * @memberof module:Middleware
 * @class
 */
class ApiPath extends LyraComponent {
    static requires() {
        return {
            fileSystem: 'util.FileSystem',
        };
    }

    get() {
        return async (ctx, next) => {
            await next();
            if (ctx.status && ctx.status !== 404) {
                return;
            }
            const { url } = ctx.request;
            const targetPath = path.join(
                this.config.rootPath,
                'components',
                'route',
                url,
            );
            const exists = await this.fileSystem.dirExists(targetPath);
            if (!exists) {
                return;
            }
            const folders = await this.fileSystem.listFolders(targetPath);
            const apiPaths = folders.map(f => path.join(url, f)).join('\n');
            ctx.body = `Available Api Paths: \n${apiPaths}`;
        };
    }
}
module.exports = ApiPath;
