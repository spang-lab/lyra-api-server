
const LyraComponent = require('lyra-component');

class LogMiddleware extends LyraComponent {
    timeToString(timeMs) {
        if (timeMs < 1000) {
            return `${timeMs}ms`;
        }
        return `${Math.round(timeMs / 1000)}s`;
    }


    get() {
        return async (ctx, next) => {
            const start = Date.now();
            const { url } = ctx.request;
            this.logger.log(`Request --> ${url}`);
            await next();
            const timeMs = Date.now() - start;

            const time = this.timeToString(timeMs);
            const { status } = ctx.response;
            this.logger.log(`<-- ${url} ${status} ${time}`);
        };
    }
}
module.exports = LogMiddleware;
