
const LyraComponent = require('lyra-component');

class DnaSequenceParser extends LyraComponent {
    static requires() {
        return {
            csvParser: 'module.parser.CsvParser',
            dnaTable: 'database.data.DnaTable',
            dnaDataMap: 'database.DnaDataMap',
            identifierDataMap: 'database.IdentifierDataMap',
            identifierList: 'database.IdentifierList',
        };
    }

    convertNames(names) {
        return {
            chromosome: names[0],
            start: names[1],
            stop: names[2],
        };
    }


    async read(db, file, fileInfo) {
        const { dataset, header } = fileInfo;
        await this.dnaTable.create(db, dataset);
        this.logger.log('Parsing dna sequences...');
        await this.csvParser.read(
            header,
            file,
            async (row) => {
                switch (row.type) {
                case 'colnames':
                    await this.handleColnames(db, row, fileInfo);
                    break;
                case 'data':
                    await this.handleData(db, row, fileInfo);
                    break;
                default:
                    this.logger.warn(`Unknown row type ${row.type} in row ${row.index}, ignoring it`);
                    break;
                }
            },
        );
        this.logger.log('Data insert complete');
        this.logger.log('Done.');
    }

    async handleColnames(db, row, fileInfo) {
        const { dataset } = fileInfo;
        const identifiers = row.data.map(identifier => ({
            name: identifier,
            type: dataset.colIdType,
        }));
        const dbIdentifiers = await this.identifierList.getOrAdd(db, identifiers);
        const mappings = dbIdentifiers.map((identifier, index) => ({
            dataset: dataset.id,
            direction: 'col',
            identifier: identifier.id,
            index,
        }));
        await this.identifierDataMap.add(db, mappings);

        this.logger.log('Added column identifiers');
        this.logger.log('Inserting data...');
    }

    async addDnaMapping(db, row, dataset) {
        const names = this.convertNames(row.names);
        const section = `[${names.start}, ${names.stop}]`;
        const mapping = {
            chromosome: names.chromosome,
            section,
            type: 'sequence_data',
            strand: 'none',
            dataset: dataset.id,
            direction: 'row',
            index: row.index,
        };
        await this.dnaDataMap.add(db, mapping);
    }

    async handleData(db, row, fileInfo) {
        const { dataset } = fileInfo;
        const { metadata } = fileInfo.header;
        await this.addDnaMapping(db, row, dataset);

        const values = row.data.map((value, index) => {
            let v = value;
            if (metadata.parsing.nullValues.includes(value.trim())) {
                v = null;
            }
            return {
                row_index: row.index,
                col_index: index,
                value: v,
            };
        });
        await this.dnaTable.add(db, dataset, values);
        this.logger.logProgress(row.index, dataset.numRows);
    }
}
module.exports = DnaSequenceParser;
