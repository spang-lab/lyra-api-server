
const LyraComponent = require('lyra-component');

class Annotation extends LyraComponent {
    static requires() {
        return {
            idDataMap: 'database.IdentifierDataMap',
            dnaTable: 'database.data.DnaTextTable',
            dnaDataMap: 'database.DnaDataMap',
            converter: 'database.Converter',
        };
    }

    async getAnnotationEntry(db, mapping, pair) {
        const entries = await this.dnaTable.get(db, mapping);
        if (!entries || entries.length !== 1) {
            throw this.customError(
                'Invalid mappings',
                `${JSON.stringify(entries, null, 2)}`,
            );
        }
        const row = entries[0];

        const rowMapping = {
            dataset: pair.dataset.id,
            index: row[0].row_index,
            direction: this.converter.direction('row'),
        };

        const dnaData = await this.dnaDataMap.reverseLookup(db, rowMapping);
        const dna = this.util.toSingle(dnaData);
        delete dna.direction;
        const identifiers = await this.idDataMap.reverseLookup(db, rowMapping);
        const data = row.reduce((acc, entry) => {
            acc[entry.name] = entry.value;
            return acc;
        }, {});

        return {
            identifiers,
            dna,
            data,
        };
    }

    async processMappings(db, mappings, pair) {
        const promises = mappings.map(async m => this.getAnnotationEntry(db, m, pair));
        return Promise.all(promises);
    }

    async filterData(data, options) {
        if (!options) {
            return data;
        }
        const { entryType, reduce } = options;
        let results = data;
        if (entryType) {
            results = results.filter(entry => entry.dna.type === entryType);
        }
        if (reduce && reduce === 'longest') {
            results = results.reduce((acc, entry) => {
                const eLength = entry.dna.stop - entry.dna.start;
                const aLength = acc.dna.stop - acc.dna.start;
                if (eLength > aLength) {
                    return entry;
                }
                return acc;
            }, { dna: { start: 0, stop: 0 } });
            return [results];
        }
        return results;
    }


    async get(db, pairs, options) {
        const mappedPairs = await this.idDataMap.get(db, pairs, true);
        const promises = mappedPairs.map(async (mappings, i) => {
            const pair = pairs[i];
            const entries = await this.processMappings(db, mappings, pair);
            const data = await this.filterData(entries, options);
            return {
                ...pair,
                data,
            };
        });
        const results = await Promise.all(promises);
        return results;
    }
}
module.exports = Annotation;
