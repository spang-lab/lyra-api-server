
const LyraComponent = require('lyra-component');

class Route extends LyraComponent {
    static requires() {
        return {
            authentication: 'module.Authentication',
        };
    }
    get() {
        return async (ctx) => {
            const { request, session } = ctx;
            const { client } = ctx.params;
            const tokens = await this.authentication.callback(
                client,
                ctx.req,
                session,
            );
            ctx.session.tokens = tokens;
            ctx.session.user = await this.authentication.userinfo(tokens.access_token);
            ctx.redirect(ctx.session.origin);
        };
    }
}
module.exports = Route;
