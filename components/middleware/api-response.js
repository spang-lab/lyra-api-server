/* eslint-disable no-param-reassign */
const path = require('path');

const LyraComponent = require('lyra-component');
/**
 * Wraps valid api responses
 * @memberof module:Middleware
 * @class
 */
class ApiResponse extends LyraComponent {
    static requires() {
        return {
        };
    }

    get() {
        return async (ctx, next) => {
            await next();
            if (ctx.status !== 200) {
                return;
            }
            const { request, body } = ctx;
            const { url } = request;
            const newBody = {
                path: url,
                data: body,
            };
            ctx.body = newBody;
        };
    }
}
module.exports = ApiResponse;
