const LyraComponent = require('lyra-component');
/*
 * Class to parse annotationfiles(*.gtf-Files) and the header
 */
class AnnotationParser extends LyraComponent {
    static requires() {
        return {
            converter: 'database.Converter',
            gtfParser: 'module.parser.GtfParser',
            identifierList: 'database.IdentifierList',
            identifierDataMap: 'database.IdentifierDataMap',
            dnaDataMap: 'database.DnaDataMap',
            dnaTable: 'database.data.DnaTextTable',
        };
    }

    convertNames(names) {
        if (!names || names.length === 0) {
            this.logger.error(`Invalid Names ${names}`);
            return '';
        }
        return names[0];
    }

    convertToIdentifier(name, type) {
        const identifier = {
            type,
            name,
        };
        try {
            this.converter.identifier(identifier);
            return identifier;
        } catch (e) {
            // ignore this attribute, not an identifier
            return null;
        }
    }

    async addIdentifiers(db, row) {
        const { attributes } = row.data;
        const identifiers = Object.keys(attributes)
            .map((type) => {
                const name = attributes[type];
                return this.convertToIdentifier(name, type);
            })
            .filter(i => i);
        return this.identifierList.getOrAdd(db, identifiers);
    }

    async addIdMappings(db, identifier, dataset, row) {
        const identifiers = this.util.toArray(identifier);
        const mappings = identifiers.map(ident => ({
            identifier: ident.id,
            dataset: dataset.id,
            direction: 'row',
            index: row.index,
        }));
        await this.identifierDataMap.add(db, mappings);
    }


    async addData(db, columns, dataset, row) {
        const data = [];
        const { attributes } = row.data;
        Object.keys(attributes).forEach((type) => {
            const name = attributes[type];
            if (this.convertToIdentifier(name, type)) {
                return;
            }
            let index = columns.indexOf(type);
            if (index === -1) {
                index = columns.push(type) - 1;
            }
            data.push({
                row_index: row.index,
                col_index: index,
                value: name,
            });
        });
        await this.dnaTable.add(db, dataset, data);
        return columns;
    }

    async addDnaMapping(db, row, dataset) {
        const { data } = row;
        const section = `[${data.start}, ${data.end}]`;
        const mapping = {
            chromosome: data.seqname,
            section,
            strand: data.strand,
            type: data.feature,
            dataset: dataset.id,
            direction: 'row',
            index: row.index,
        };
        await this.dnaDataMap.add(db, mapping);
    }

    async addColnames(db, columns, dataset) {
        const identifiers = columns.map(name => ({
            name,
            type: 'pheno statistic',
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
    }


    async read(db, file, fileInfo) {
        const { header, dataset } = fileInfo;
        await this.dnaTable.create(db, dataset);
        let columns = [];
        await this.gtfParser.read(
            header,
            file,
            async (row) => {
                switch (row.type) {
                case 'data':
                    columns = await this.handleData(db, row, dataset, columns);
                    break;
                default:
                    this.logger.warn(`Unknown row type ${row.type} in row ${row.index}, ignoring it`);
                    break;
                }
            },
        );
        await this.addColnames(db, columns, dataset);
        this.logger.log('Done.');
    }

    async handleData(db, row, dataset, columns) {
        const identifiers = await this.addIdentifiers(db, row);
        await this.addIdMappings(db, identifiers, dataset, row);
        const newColumns = await this.addData(db, columns, dataset, row);
        await this.addDnaMapping(db, row, dataset);
        this.logger.logProgress(row.index, dataset.numRows);
        return newColumns;
    }
}

module.exports = AnnotationParser;
