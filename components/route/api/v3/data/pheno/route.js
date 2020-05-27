
const LyraComponent = require('lyra-component');

class Route extends LyraComponent {
    static requires() {
        return {
            idDataMap: 'database.IdentifierDataMap',
            phenoTable: 'database.data.PhenoTable',
        };
    }

    get() {
        return async (ctx) => {
            const { db, pairs } = ctx.state;
            const mappings = await this.idDataMap.get(
                db,
                pairs,
            );
            const pData = await this.phenoTable.get(
                db,
                mappings,
            );
            const response = pData.map((d, i) => {
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
