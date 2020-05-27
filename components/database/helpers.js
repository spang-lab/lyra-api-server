
const LyraComponent = require('lyra-component');
const pgp = require('pg-promise')({
    capSQL: true,
});
/**
 * Database utility functions
 * @memberof module:Database
 * @class
 */
class Helpers extends LyraComponent {
    static requires() {
        return {
        };
    }

    constructor(...args) {
        super(...args);
        this.columnSets = this.getColumnSets();
    }

    getColumnSets() {
        const sets = {};
        const values = this.config.static.columns;
        values.forEach((columnSet) => {
            const { table, columns } = columnSet;
            sets[table] = new pgp.helpers.ColumnSet(
                columns,
                { table },
            );
        });
        return sets;
    }

    getTableColumns(table) {
        const columns = this.columnSets[table];
        if (!columns) {
            throw this.customError(
                'UnknownTableError',
                `Unknown Table ${table}, no columns found`,
            );
        }
        return columns;
    }

    sets(...args) {
        return pgp.helpers.sets(...args);
    }

    csv(...args) {
        return pgp.as.csv(...args);
    }

    format(query, values, options) {
        return pgp.as.format(query, values, options);
    }

    where(conditions, keyword = 'AND') {
        const queries = Object.keys(conditions).map((key) => {
            const name = pgp.as.value(key);
            const value = pgp.as.text(conditions[key]);
            return `${name}=${value}`;
        });
        const query = queries.join(` ${keyword} `);
        return query;
    }

    insert(values, table, dataset) {
        const columns = this.getTableColumns(table);
        if (dataset) {
            const id = pgp.as.number(dataset.id);
            const tableName = `dataset_${id}`;
            return pgp.helpers.insert(values, columns, tableName);
        }
        return pgp.helpers.insert(
            values,
            columns,
        );
    }
}
module.exports = Helpers;
