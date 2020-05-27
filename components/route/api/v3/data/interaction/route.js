
const LyraComponent = require('lyra-component');

class Route extends LyraComponent {
    static requires() {
        return {
            interaction: 'module.Interaction',
        };
    }

    get() {
        return async (ctx) => {
            const { db, pairs } = ctx.state;
            const { options } = ctx.request.body;
            const promises = pairs.map(async pair => ({
                ...pair,
                data: await this.interaction.get(db, pair, options),
            }));
            const results = await Promise.all(promises);
            ctx.body = results;
        };
    }
}
module.exports = Route;
