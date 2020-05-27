

const LyraComponent = require('lyra-component');

class ErrorMiddleware extends LyraComponent {
    get() {
        return async (ctx, next) => {
            try {
                await next();
            } catch (err) {
                const errorString = err
                    .toString()
                    .replace(/\n/g, '')
                    .replace(/\s+/g, ' ');
                this.logger.error(errorString);
                ctx.status = ctx.status || 500;
                ctx.body = {
                    error: errorString,
                };
            }
        };
    }
}
module.exports = ErrorMiddleware;
