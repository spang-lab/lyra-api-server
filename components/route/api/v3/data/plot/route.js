
const LyraComponent = require('lyra-component');

class Route extends LyraComponent {
    static requires() {
        return {
            plotTable: 'database.data.PlotTable',
        };
    }

    get() {
        return async (ctx) => {
            const { db, dataset } = ctx.state;
            const { name } = ctx.request.body;
            if (!name) {
                throw this.customError(
                    'NoPlotNameError',
                    `No plot name given in 
                         ${JSON.stringify(ctx.request.body)}`,
                );
            }
            if (!dataset) {
                throw this.customError(
                    'DatasetError',
                    `Invalid dataset ${JSON.stringify(dataset)}`,
                );
            }
            const result = await this.plotTable.get(db, {
                name,
                dataset: dataset.id,
            });
            if (!result) {
                throw this.customError(
                    'PlotNotFoundError',
                    `Plot with name ${name} does not exist`,
                );
            }
            const plot = result.data;
            plot.info.id = result.id;
            plot.info.name = result.name;
            ctx.body = plot;
        };
    }
}
module.exports = Route;
