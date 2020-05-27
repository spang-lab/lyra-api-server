
const LyraComponent = require('lyra-component');

class IdentifierMappingParser extends LyraComponent {
    static requires() {
        return {
            csvParser: 'module.parser.CsvParser',
            identifierList: 'database.IdentifierList',
            idIdMap: 'database.IdentifierIdentifierMap',
        };
    }

    async read(db, file, fileInfo) {
        const { header } = fileInfo;
        this.logger.log('Parsing identifier map');
        await this.csvParser.read(
            header,
            file,
            async (row) => {
                this.logger.logProgress(row.index, fileInfo.dataset.numRows);
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
        this.logger.log('Insert complete.');
    }

    async handleColnames() {
        this.logger.log('Colnames ignored');
        this.logger.log('Reading data...');
    }

    toIdentifiers(type, ids, metadata) {
        const { extraDelimiters, nullValues } = metadata.parsing;
        const re = new RegExp(`[${extraDelimiters.join('')}]`);
        const identifiers = ids
            .split(re)
            .map(id => id.trim())
            .filter((id) => {
                if (nullValues.includes(id)) {
                    return false;
                }
                if (id.length > 32) {
                    this.logger.warn(`id: ${id} ignored, too long`);
                    return false;
                }
                return true;
            })
            .map(id => ({
                name: id,
                type,
            }));
        return identifiers;
    }

    getWeight(row) {
        if (row.data.length > 4) {
            return Math.round(row.data[4] * 10000);
        }
        return 0;
    }


    async handleData(db, row, fileInfo) {
        const { dataset, header } = fileInfo;
        const { metadata } = header;
        const [idType1, idType2, id1, id2] = row.data;
        const idList1 = this.toIdentifiers(idType1, id1, metadata);
        const idList2 = this.toIdentifiers(idType2, id2, metadata);
        const dbIds1 = await this.identifierList.getOrAdd(db, idList1);
        const dbIds2 = await this.identifierList.getOrAdd(db, idList2);
        const weight = this.getWeight(row);
        const type = metadata.interaction_type;

        const mappings = [];
        dbIds1.forEach((ident1) => {
            dbIds2.forEach((ident2) => {
                const mapping = {
                    identifier_1: ident1.id,
                    identifier_2: ident2.id,
                    dataset: dataset.id,
                    weight,
                    type,
                };
                mappings.push(mapping);
            });
        });
        if (!mappings.length) {
            return;
        }
        await this.idIdMap.add(db, mappings);
    }
}
module.exports = IdentifierMappingParser;
