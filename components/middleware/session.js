const LyraComponent = require('lyra-component');
const session = require('koa-session');

class Session extends LyraComponent {
    get(app) {
        const config = {
            key: 'koa:sess',
            maxAge: 86400000,
            autoCommit: true,
            overwrite: true,
            httpOnly: true,
            signed: true,
            rolling: false,
            renew: false,
        };
        const sessionMiddleware = session(config, app);
        return sessionMiddleware;
    }
}
module.exports = Session;
