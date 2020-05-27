const LyraComponent = require('lyra-component');

class ResolveVirtual extends LyraComponent {
    static requires() {
        return {
            string: 'module.StringApi',
        };
    }

    get() {
        return async (ctx, next) => {
            const { db, identifiers } = ctx.state;
            const { dataset } = ctx.request.body;
            const { options } = ctx.request.body;
            let result;
            switch (dataset) {
            case 'string_human':
                result = await this.string.getInteractions(
                    db,
                    identifiers,
                    'homo sapiens',
                    options,
                );
                ctx.body = {
                    identifiers,
                    data: result,
                };
                return;
            case 'string_mouse':
                result = await this.string.getInteractions(
                    db,
                    identifiers,
                    'mus musculus',
                    options,
                );
                ctx.body = {
                    identifiers,
                    data: result,
                };
                return;
            default:
                await next();
            }
        };
    }
}
module.exports = ResolveVirtual;
