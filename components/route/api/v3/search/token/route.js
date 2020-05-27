const LyraComponent = require('lyra-component');


class Route extends LyraComponent {
    static requires() {
        return {
            search: 'module.Search',
        };
    }

    get() {
        return async (ctx) => {
            const { db } = ctx.state;
            const { token } = ctx.request.body;
            const result = await this.search.token(db, token);
            ctx.body = result;
        };
    }
}
module.exports = Route;
