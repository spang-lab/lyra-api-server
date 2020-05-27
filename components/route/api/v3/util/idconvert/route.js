
const LyraComponent = require('lyra-component');

class Route extends LyraComponent {
    static requires() {
        return {
            idConvert: 'module.IdConvert',
        };
    }

    get() {
        return async (ctx) => {
            const { db, identifiers } = ctx.state;
            console.log(identifiers);
            const { types } = ctx.request.body;
            const results = await this.idConvert.get(db, {
                identifiers,
                types,
            });
            ctx.body = results;
        };
    }
}
module.exports = Route;
