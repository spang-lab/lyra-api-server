const LyraComponent = require('lyra-component');


class Route extends LyraComponent {
    static requires() {
        return {
            search: 'module.Search',
        };
    }

    get() {
        return async (ctx) => {
            const { db, species } = ctx.state;
            const { queries, options } = ctx.request.body;
            if (!queries) {
                throw new Error(`
                    No Search Queries in req body 
                    ${JSON.stringify(ctx.request.body, null, 2)}
                `);
            }
            const results = await this.search.query(
                db,
                queries,
                options,
                species,
            );
            const data = queries.map((query, i) => ({
                query,
                data: results[i],
            }));
            ctx.body = data;
        };
    }
}
module.exports = Route;
