
const LyraComponent = require('lyra-component');

class Route extends LyraComponent {
    static requires() {
        return {
            idDataMap: 'database.IdentifierDataMap',
            matrixTable: 'database.data.MatrixTable',
        };
    }

    get() {
        return async (ctx) => {
            const { db, pairs } = ctx.state;
            const mappings = await this.idDataMap.get(db, pairs);
            const matrixData = await this.matrixTable.get(db, mappings);
            const response = matrixData.map((d, i) => {
                const pair = pairs[i];
                return {
                    identifier: pair.identifier,
                    dataset: pair.dataset,
                    data: d,
                };
            });
            ctx.body = response;
        };
    }
}
module.exports = Route;
