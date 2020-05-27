
const LyraComponent = require('lyra-component');

/**
 * Middleware for creating 404 errors on invalid routes
 * @memberof module:Middleware
 * @class
 */
class NotFound extends LyraComponent {
    get() {
        return async (ctx, next) => {
            await next();
            if (ctx.status && ctx.status !== 404) {
                return;
            }
            const path = ctx.request.href;
            ctx.throw(
                404,
                `Path ${path} is not a valid request path`,
            );
        };
    }
}
module.exports = NotFound;
