
const LyraComponent = require('lyra-component');

class Route extends LyraComponent {
    static requires() {
        return {
            dataset: 'database.Dataset',
        };
    }

    get() {
        return async (ctx) => {
            const { db, dataset } = ctx.state;
            if (!dataset) {
                const datasets = await this.dataset.list(db);
                ctx.body = datasets;
                return;
            }
            ctx.body = dataset;
        };
    }
}
module.exports = Route;
