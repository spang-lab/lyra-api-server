const LyraComponent = require('lyra-component');


class DnaSearch extends LyraComponent {
    static requires() {
        return {
            connection: 'database.Connection',
            dbutil: 'database.Util',
            identifierDataMap: 'database.IdentifierDataMap',
        };
    }


    async getDirection(dataset) {
        const tDataset = await this.identifierTypes.convertDataset(
            null,
            dataset,
        );
        const validTypes = ['genome section', 'named genome section'];
        if (validTypes.includes(tDataset.colType.name)) {
            return {
                indexDir: 'col_index',
                altDir: 'row_index',
                nameDir: 'row',
            };
        }
        if (validTypes.includes(tDataset.rowType.name)) {
            return {
                indexDir: 'row_index',
                altDir: 'col_index',
                nameDir: 'col',
            };
        }
        throw this.customError(
            'IncompatibleDatasetError',
            `Cannot get Dna Entries for dataset ${dataset.name},
             it has no 'genome section' identifiers`,
        );
    }


    async findData(task, request) {
        const dataset = request.dataset;
        const params = await this.getDirection(dataset);

        const names = await this.identifierDataMap.getNames(null, {
            dataset,
            direction: params.nameDir,
        });
        const nameDict = this.util.arrayToDict(names, 'index', false);

        const range = request.range;

        const db = task || this.connection.get();
        const section = `int8range(${range.start},${range.stop})`;
        const query =
            `SELECT ddt.section,
                    upper(ddt.section) as stop,
                    lower(ddt.section) as start,
                    ddt.strand,
                    ddt.index as entry,
                    ddt.chromosome,
                    dt.$(altDir#) as index,
                    dt.value
            FROM $(dnaDataTableName#) ddt
            INNER JOIN $(dataTableName#) AS dt
            ON ddt.index = dt.$(indexDir#)
            WHERE
                ddt.chromosome = $(chromosome)
                AND ddt.section && $(section#)
                AND ddt.dataset = $(dataset)
            `;
        const rows = await db.any(query, {
            dnaDataTableName: this.dbutil.getTableName('DNA_DATA_MAP'),
            dataTableName: this.dbutil.getDataTable(dataset.id),
            ...params,
            section,
            chromosome: range.chromosome,
            dataset: dataset.id,
        });
        const entryDict = this.util.arrayToDict(rows, 'entry', true);
        const dataList = Object.keys(entryDict).map((key) => {
            const entries = entryDict[key];
            if (!entries || !entries.length) {
                return {};
            }
            const values = entries.map((entry) => {
                const name = nameDict[entry.index];
                return {
                    ...name,
                    value: entry.value,
                    index: entry.index,
                };
            });
            const refEntry = entries[0];
            return {
                section: refEntry.section,
                strand: refEntry.strand,
                chromosome: refEntry.chromosome,
                start: refEntry.start,
                stop: refEntry.stop,
                values,
            };
        });

        return dataList;
    }

}

module.exports = DnaSearch;
