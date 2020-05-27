
const LyraComponent = require('lyra-component');

class Route extends LyraComponent {
    static requires() {
        return {
            authentication: 'module.Authentication',
        };
    }

    get() {
        return async (ctx) => {
            const { client } = ctx.params;
            const origin = ctx.request.query.r || '/';
            const { url, session } = await this.authentication.login(client);
            console.log(url, session);
            Object.assign(ctx.session, session);
            ctx.session.origin = origin;
            ctx.redirect(url);
        };
    }
}
module.exports = Route;
