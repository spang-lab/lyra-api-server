
const LyraComponent = require('lyra-component');

class Route extends LyraComponent {
    static requires() {
        return {
            dnaDataMap: 'database.DnaDataMap',
            dnaTable: 'database.data.DnaTable',
        };
    }

    get() {
        return async (ctx) => {
            const pairs = [];
            const { dna, dataset, db } = ctx.state;
            dna.forEach((range) => {
                pairs.push({
                    dataset,
                    range,
                });
            });
            const mappingList = await this.dnaDataMap.get(
                db,
                pairs,
            );
            const promises = pairs.map(async (p, i) => {
                const mappings = mappingList[i];
                const data = await this.dnaTable.get(db, mappings);
                const values = mappings.map((m, j) => ({
                    dna: {
                        start: m.start,
                        stop: m.stop,
                        chromosome: m.chromosome,
                    },
                    values: data[j],
                }));
                return {
                    ...p,
                    data: values,
                };
            });
            const mappedPairs = await Promise.all(promises);

            ctx.body = mappedPairs;
        };
    }
}
module.exports = Route;
