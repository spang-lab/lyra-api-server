const LyraComponent = require('lyra-component');


class Route extends LyraComponent {
    static requires() {
        return {
            search: 'module.Search',
        };
    }

    get() {
        return async (ctx) => {
            const { db, identifiers } = ctx.state;
            const { body } = ctx.request;
            const tId = body.tId || '';
            const result = await this.search.id(
                db,
                identifiers,
                tId,
            );
            ctx.body = result;
        };
    }
}
module.exports = Route;
