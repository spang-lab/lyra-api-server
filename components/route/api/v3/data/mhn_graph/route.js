
const LyraComponent = require('lyra-component');

class Route extends LyraComponent {
    static requires() {
        return {
            graphTable: 'database.data.GraphTable',
        };
    }

    get() {
        return async (ctx) => {
            const { db, dataset } = ctx.state;
            const { name } = ctx.request.body;
            if (!name) {
                throw this.customError(
                    'NoGraphNameError',
                    `No graph name given in 
                     ${JSON.stringify(ctx.request.body)}`,
                );
            }
            if (!dataset) {
                throw this.customError(
                    'DatasetError',
                    `Invalid dataset ${JSON.stringify(dataset)}`,
                );
            }
            if (!dataset) {
                throw this.customError(
                    'DatasetError',
                    `Invalid dataset ${JSON.stringify(dataset)}`,
                );
            }
            const result = await this.graphTable.get(db, {
                name,
                dataset: dataset.id,
            });
            ctx.body = result;
        };
    }
}
module.exports = Route;
