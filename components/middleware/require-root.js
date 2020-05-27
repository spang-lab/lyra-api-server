const LyraComponent = require('lyra-component');
/**
 * Rejects users that are not logged in,
 * WARNING: this does not check access rights
 * if you need this use {@link RequireAccess} middleware
 * @memberof module:Middleware
 * @class
 */
class RequireRoot extends LyraComponent {
    get() {
        return async (ctx, next) => {
            const { body } = ctx.request;
            const password = body.rootPassword;
            if (!password) {
                throw new Error('no password given, access denied');
            }
            const realPassword = this.config.secrets.rootPassword;
            if (password !== realPassword) {
                throw new Error('wrong root password');
            }
            await next();
        };
    }
}
module.exports = RequireRoot;
