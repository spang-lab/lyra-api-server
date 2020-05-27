/* Class to parse annotationfiles(*.gtf-Files) and returning infos to the class annotation
*/
const csv = require('csv');
const LyraComponent = require('lyra-component');


class GtfParser extends LyraComponent {
    static requires() {
        return {
        };
    }

    async read(header, file, rowHandler) {
        this.logger.log('Reading gtf...');
        const options = this.readHeader(header);
        const columns = [
            'seqname',
            'source',
            'feature',
            'start',
            'end',
            'score',
            'strand',
            'frame',
            'attribute',
        ];
        const parser = csv.parse({
            relax_column_count: true,
            comment: options.commentString,
            relax: true,
            delimiter: '\t',
        });
        let count = 0;
        const attributeRegEx = /\s*(\w+)\s*"(\w+)"\s*/g;
        const transformer = csv.transform(async (row, callback) => {
            try {
                const rowDict = {};
                row.forEach((value, index) => {
                    let v = value;
                    if (options.nullValues.includes(value)) {
                        v = null;
                    }
                    rowDict[columns[index]] = v;
                });
                rowDict.attributes = {};
                let match = attributeRegEx.exec(rowDict.attribute);
                while (match) {
                    rowDict.attributes[match[1]] = match[2];
                    match = attributeRegEx.exec(rowDict.attribute);
                }
                delete rowDict.attribute;
                await rowHandler({
                    type: 'data',
                    names: [],
                    data: rowDict,
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
            transformer.on('end', () => {
                if (count !== header.dataset.numRows) {
                    reject(this.customError(
                        'InvalidRowCountError',
                        `Expected ${header.dataset.num_rows} data rows
                         got ${count}`,
                    ));
                    return;
                }
                resolve();
            });
            file.stream.pipe(parser).pipe(transformer);
        });
    }

    readHeader(header) {
        return {
            nullValues: [],
            extraDelimiters: [],
            commentString: '',
            ...header.metadata.parsing,
        };
    }
}

module.exports = GtfParser;

