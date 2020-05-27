
const LyraComponent = require('lyra-component');

class Route extends LyraComponent {
    static requires() {
        return {
            authentication: 'module.Authentication',
        };
    }

    get() {
        return async (ctx) => {
            const { tokens } = ctx.session;
            const { client } = ctx.params;
            if (!tokens) {
                throw new Error('already logged out');
            }
            const url = await this.authentication.logout(
                client,
                tokens.id_token,
            );
            // Destroy the active session
            ctx.session = null;
            ctx.redirect(url);
        };
    }
}
module.exports = Route;
