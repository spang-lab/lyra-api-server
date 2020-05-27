
const LyraComponent = require('lyra-component');

class Route extends LyraComponent {
    get() {
        return async (ctx) => {
            const { user } = ctx.session;
            ctx.body = user;
        };
    }
}
module.exports = Route;
