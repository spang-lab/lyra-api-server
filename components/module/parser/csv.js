const csv = require('csv');
const LyraComponent = require('lyra-component');

class CsvParser extends LyraComponent {
    static requires() {
        return {
        };
    }

    async read(header, file, rowHandler) {
        this.logger.log('Reading csv...');
        const parser = csv.parse();
        let count = 0;
        const options = this.readHeader(header);
        const transformer = csv.transform(async (row, callback) => {
            try {
                const names = row.splice(0, options.nameColumns);
                if (options.colnames) {
                    options.colnames = false;
                    await rowHandler({
                        type: 'colnames',
                        names,
                        data: row,
                        index: count,
                    });
                    callback();
                    return;
                }
                if (row.length !== header.dataset.numCols) {
                    throw this.customError(
                        'InvalidColumnCountError',
                        `Expected ${header.dataset.numCols} data columns, 
                         got ${row.length}`,
                    );
                }
                await rowHandler({
                    type: 'data',
                    names,
                    data: row,
                    index: count,
                });
                count += 1;
                callback();
            } catch (e) {
                this.logger.error(`Error in row ${row}`);
                callback(e);
            }
        }, {
            parallel: 1,
            consume: true,
        });
        return new Promise((resolve, reject) => {
            parser.on('error', e => reject(e));
            transformer.on('error', e => reject(e));
            transformer.on('end', () => resolve());
            file.stream.pipe(parser).pipe(transformer);
        });
    }

    readHeader(header) {
        let colnames = true;
        let nameColumns = 0;
        if (header.dataset.colIdType === 'none') {
            colnames = false;
        }
        switch (header.dataset.rowIdType) {
        case 'ensembl gene id':
        case 'gene name':
        case 'uniprot accession':
        case 'affy id':
            nameColumns = 1;
            break;
        case 'genome section':
            nameColumns = 3;
            break;
        case 'named genome section':
            nameColumns = 4;
            break;
        case 'none':
            nameColumns = 0;
            break;
        case 'human sample':
        case 'mouse sample':
        case 'cell sample':
            nameColumns = 1;
            break;
        default:
            throw this.customError(
                'UnimplementedRowIdentifier',
                `No known offset for identifier ${header.dataset.rowIdType}`,
            );
        }
        return {
            colnames,
            nameColumns,
        };
    }
}

module.exports = CsvParser;

