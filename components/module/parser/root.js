
const zlib = require('zlib');
const tar = require('tar-stream');
const fs = require('fs');

const LyraComponent = require('lyra-component');


class RootParser extends LyraComponent {
    static requires() {
        return {
            dbutil: 'database.Util',
            identifierList: 'database.IdentifierList',
            dataset: 'database.Dataset',
            headerParser: 'module.parser.HeaderParser',
            phenoMatrixParser: 'module.parser.PhenoMatrixParser',
            expressionMatrixParser: 'module.parser.ExpressionMatrixParser',
            identifierMappingParser: 'module.parser.IdentifierMappingParser',
            dnaSequenceParser: 'module.parser.DnaSequenceParser',
            ymlPlotParser: 'module.parser.YmlPlotParser',
            annotationParser: 'module.parser.AnnotationParser',
            graphParser: 'module.parser.GraphParser',
        };
    }

    /**
     * read a .tar.gz file
     * @param {object} file - the file to read
     * @param {string} file.name - the name of the file
     * @param {string} file.path - the path to the file
     * @param {boolean} dryRun - if true, do not modify the database, just verify
     */
    async read(db, file) {
        if (file.dryRun) {
            this.logger.warn('Dry run, the data will not be inserted');
        }
        this.logger.log(`Opening file ${file.fullPath}`);

        const fStream = fs.createReadStream(file.fullPath);
        const gunzip = zlib.createGunzip();
        const extract = tar.extract();
        let fileInfo = file;
        await new Promise((resolve, reject) => {
            extract.on('entry', async (header, stream, next) => {
                const childFile = {
                    header,
                    stream,
                };
                try {
                    fileInfo = await this.handleChildFile(db, childFile, fileInfo);
                } catch (e) {
                    next(e);
                }
                next();
            });
            extract.on('finish', () => resolve());
            fStream
                .pipe(gunzip)
                .on('error', e => reject(e))
                .pipe(extract)
                .on('error', e => reject(e));
        });
    }
    async handleChildFile(db, childFile, fileInfo) {
        this.logger.verbose(`child file: ${childFile.header.name}`);
        const { name } = childFile.header;
        if (name === 'header.yml') {
            return this.headerHandler(db, childFile, fileInfo);
        }
        if (name.match(/data\..*/)) {
            return this.dataHandler(db, childFile, fileInfo);
        }
        return this.defaultHandler(db, childFile, fileInfo);
    }

    async headerHandler(db, file, fileInfo) {
        this.logger.log('header detected, parsing...');
        const header = await this.headerParser.read(file);
        this.logger.log('done');
        return {
            ...fileInfo,
            header,
        };
    }

    async dataHandler(db, file, fInfo) {
        let fileInfo = fInfo;
        this.logger.log('data detected, parsing...');
        if (!fileInfo.header) {
            throw this.customError(
                'InvalidFileOrderError',
                'The first file in the archive has to be header.yml',
            );
        }
        try {
            fileInfo = await this.prepareDataInsert(db, fileInfo);
            const parser = this.getChildParser(fileInfo.header);
            await parser.read(db, file, fileInfo);
            if (fileInfo.dryRun) {
                throw this.customError(
                    'DryRunError',
                    'This Error is thrown to rollback the datbase transaction in a dry run',
                );
            }
            return fileInfo;
        } catch (err) {
            this.identifierList.clearCache();
            throw err;
        }
    }

    async defaultHandler(db, file, fileInfo) {
        this.logger.error(`unexpected file ${file.header.name} in ${fileInfo.name}, skipping...`);
        await new Promise((resolve) => {
            file.stream.on('end', () => resolve());
            file.stream.resume();
        });
        return fileInfo;
    }

    async prepareDataInsert(db, fileInfo) {
        this.logger.log('Adding dataset entry');
        const datasetInfo = {
            ...fileInfo.header.dataset,
            file_name: fileInfo.name,
            hash: fileInfo.hash,
        };
        const dataset = await this.dataset.add(db, datasetInfo);
        return {
            ...fileInfo,
            dataset,
        };
    }

    getChildParser(header) {
        switch (header.dataset.type) {
        case 'expression_matrix':
        case 'mutation_matrix':
        case 'copy_number_matrix':
            return this.expressionMatrixParser;
        case 'pheno_data_matrix':
            return this.phenoMatrixParser;
        case 'identifier_mapping':
            return this.identifierMappingParser;
        case 'dna_sequence_data':
            return this.dnaSequenceParser;
        case 'plot_list':
            return this.ymlPlotParser;
        case 'annotation':
            return this.annotationParser;
        case 'mhn_graph':
            return this.graphParser;
        default:
            throw this.customError(
                'UnimplementedParserError',
                `No parser for dataset type ${header.dataset.type}`,
            );
        }
    }
}

module.exports = RootParser;
