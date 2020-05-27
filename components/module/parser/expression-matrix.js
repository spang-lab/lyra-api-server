const LyraComponent = require('lyra-component');

class ExpressionMatrixParser extends LyraComponent {
    static requires() {
        return {
            csvParser: 'module.parser.CsvParser',
            matrixTable: 'database.data.MatrixTable',
            identifierDataMap: 'database.IdentifierDataMap',
            identifierList: 'database.IdentifierList',
        };
    }

    convertNames(names) {
        if (!names || names.length === 0) {
            this.logger.error(`Invalid Names ${names}`);
            return '';
        }
        return names[0];
    }

    async read(task, file, fileInfo) {
        const { header, dataset } = fileInfo;
        await this.matrixTable.create(task, dataset);
        this.logger.log('Parsing data matrix...');
        await this.csvParser.read(
            header,
            file,
            async (row) => {
                switch (row.type) {
                case 'colnames':
                    await this.handleColnames(task, row, fileInfo);
                    break;
                case 'data':
                    await this.handleData(task, row, fileInfo);
                    break;
                default:
                    this.logger.warn(`Unknown row type ${row.type} in row ${row.index}, ignoring it`);
                    break;
                }
            },
        );
        this.logger.log('Data insert complete');
        this.logger.log('Dataset requires post processing. Starting...');
        await this.matrixTable.process(task, dataset);
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

    async handleData(db, row, fileInfo) {
        const { dataset, header } = fileInfo;
        if (row.index >= dataset.numRows) {
            throw this.customError(
                'InvalidRowCountError',
                `Expected ${dataset.numRows} rows,
                 got at least ${row.index + 1} rows`,
            );
        }
        const identifier = {
            name: this.convertNames(row.names),
            type: dataset.rowIdType,
        };
        const dbIdentifier = await this.identifierList.getOrAdd(db, identifier);
        const mapping = {
            identifier: dbIdentifier.id,
            dataset: dataset.id,
            direction: 'row',
            index: row.index,
        };
        await this.identifierDataMap.add(db, mapping);
        const values = this.processValues(row.index, row.data, header.metadata);

        await this.matrixTable.add(db, dataset, values);
        this.logger.logProgress(row.index, dataset.numRows);
    }

    processValues(index, values, metadata) {
        const nullValues = metadata.parsing.nullValues || [];
        return values.map((value, i) => {
            let v = value.trim();
            if (nullValues.includes(v)) {
                v = null;
            }
            return {
                row_index: index,
                col_index: i,
                value: v,
            };
        });
    }
}

module.exports = ExpressionMatrixParser;
