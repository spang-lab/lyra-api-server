const yaml = require('js-yaml');
const LyraComponent = require('lyra-component');

class YmlPlotParser extends LyraComponent {
    static requires() {
        return {
            plotTable: 'database.data.PlotTable',
        };
    }

    async read(db, file, fileInfo) {
        const { dataset } = fileInfo;
        await this.plotTable.create(db, dataset);
        const oneMb = 1048576; // Bytes
        this.logger.log('checking file size...');
        if (file.header.size > oneMb * 2) {
            throw this.customError('FileSizeError', 'file size too big, > 2Mb');
        }
        const plotList = await this.readYml(file);
        this.logger.log('inserting plots');
        const insertPromises = plotList.map((plot) => {
            const value = {
                name: plot.name,
                data: plot.plot,
            };

            return this.plotTable.add(db, dataset, value);
        });
        await Promise.all(insertPromises);
        this.logger.log('all plots inserted.');
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
                    const plots = yaml.safeLoad(dataString);
                    this.logger.log('plots valid');
                    resolve(plots);
                } catch (e) {
                    reject(e);
                }
            });
        });
    }
}
module.exports = YmlPlotParser;
