
const LyraComponent = require('lyra-component');

class Route extends LyraComponent {
    static requires() {
        return {
            ncbi: 'module.NcbiApi',
        };
    }

    get() {
        return async (ctx) => {
            const { species, identifiers } = ctx.state;
            const promises = identifiers.map(async (ids) => {
                try {
                    const id = this.util.toSingle(ids);
                    if (!id.type === 'gene name') {
                        return null;
                    }
                    const result = await this.ncbi.findGeneName(
                        id.name,
                        species,
                    );
                    return result;
                } catch (e) {
                    if (e.name === 'NameNotFoundError') {
                        return null;
                    }
                    throw e;
                }
            });
            const results = await Promise.all(promises);
            ctx.body = results;
        };
    }
}
module.exports = Route;
