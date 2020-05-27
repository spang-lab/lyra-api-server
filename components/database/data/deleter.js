const LyraComponent = require('lyra-component');

class Deleter extends LyraComponent {
    static requires() {
        return {
            dataset: 'database.Dataset',
            identifierList: 'database.IdentifierList',
            identifierDataMap: 'database.IdentifierDataMap',
            identifierIdentifierMap: 'database.IdentifierIdentifierMap',
            dnaDataMap: 'database.DnaDataMap',
            converter: 'database.Converter',
        };
    }

    async delete(db, file) {
        const dataset = file.dbentry;
        this.logger.warn(`Deleting dataset ${dataset.name}`);
        await this.deleteTable(db, dataset);
        await this.deleteMappings(db, dataset);
        await this.deleteEntry(db, dataset);
        this.logger.warn('dataset deleted');
        if (file.deleteOrphans) {
            this.logger.warn('Deleting orphan identifiers...');
            this.logger.log('This will take a while');
            await this.identifierList.deleteOrphans(db);
        }
        this.logger.warn('Done');
    }
    /**
     * Delete the data table for a dataset
     * @param {integer} datasetId - the id of the dataset to delete
     */
    async deleteTable(db, dataset) {
        this.logger.verbose('Dropping Table...');
        const query = `
            DROP TABLE IF EXISTS data.dataset_$(id#)
            `;
        await db.none(query, {
            id: dataset.id,
        });
        this.logger.verbose('Done.');
    }

    async deleteMappings(db, dataset) {
        this.logger.verbose('Removing mappings...');
        await this.identifierDataMap.deleteDataset(db, dataset);
        await this.dnaDataMap.deleteDataset(db, dataset);
        await this.identifierIdentifierMap.deleteDataset(db, dataset);
        this.logger.verbose('Done.');
    }

    async deleteEntry(db, dataset) {
        this.logger.verbose('Deleting dataset entry...');
        await this.dataset.delete(db, dataset);
    }
}
module.exports = Deleter;

