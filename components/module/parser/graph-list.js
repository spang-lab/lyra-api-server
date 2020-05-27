const yaml = require('js-yaml');
const LyraComponent = require('lyra-component');

class GraphParser extends LyraComponent {
    static requires() {
        return {
            graphTable: 'database.data.GraphTable',
        };
    }

    async read(db, file, fileInfo) {
        const { dataset } = fileInfo;
        await this.graphTable.create(db, dataset);
        const oneMb = 1048576; // Bytes
        this.logger.log('checking file size...');
        if (file.header.size > oneMb * 2) {
            throw this.customError('FileSizeError', 'file size too big, > 2Mb');
        }
        const graphList = await this.readYml(file);
        const insertPromises = graphList.map(graph =>
            this.graphTable.add(db, dataset, graph));
        await Promise.all(insertPromises);
        this.logger.log('all graphs inserted.');
    }

    async readYml(file) {
        return new Promise((resolve, reject) => {
            let dataString = '';
            file.stream.on('data', (chunk) => {
                const part = chunk.toString();
                dataString += part;
            });
            file.stream.on('end', async () => {
                this.logger.log('parsing yml...');
                try {
                    const graphs = yaml.safeLoad(dataString);
                    this.logger.log('graphs valid');
                    resolve(graphs);
                } catch (e) {
                    reject(e);
                }
            });
        });
    }
}
module.exports = GraphParser;
