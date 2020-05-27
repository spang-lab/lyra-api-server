const LyraComponent = require('lyra-component');

class DnaDataMap extends LyraComponent {
    static requires() {
        return {
            helpers: 'database.Helpers',
            converter: 'database.Converter',
        };
    }

    /**
        Add a new mapping
        @param {database} db - an active database transaction, or null
        @param {object}   mapping - the mapping to add
        @param {integer} mapping.start - the start of the dna section
        @param {integer} mapping.stop - the stop of the dna sectio
        @param {string} mapping.strand - '+' '-' 'none' or 'both'
        @param {string} mapping.chromosome - chromosome of the dna section
        @param {integer} mapping.dataset - the id of the dataset
        @param {string}  mapping.direction - row or col
        @param {integer} mapping.index  - the row or column index
        */
    async add(db, mapping) {
        const mappings = this.util.toArray(mapping);
        const dbMappings = mappings.map(m => this.converter.dnaMapping(m));
        if (!dbMappings || !dbMappings.length) {
            throw this.customError(
                'NoMappingsError',
                `Mappings is: ${JSON.stringify(mapping)}`,
            );
        }
        const query = this.helpers.insert(
            dbMappings,
            'dna_data_map',
        );
        return db.none(query);
    }

    /**
     * get a dna data mapping
     * @param {database} db - database connection
     * @param {object} pair - the pair to find
     * @param {object} pair.dataset - the dataset
     * @param {object} pair.range - the dna range
     */
    async get(db, pair) {
        const pairs = this.util.toArray(pair);
        const query =
            `SELECT 
                *,
                lower(section) as start,
                upper(section) as stop
             FROM dna_data_map
             WHERE chromosome = $(chromosome)
             AND section && $(section)
             AND dataset = $(dataset)
            `;
        const promises = pairs.map(async p =>
            db.any(query, {
                chromosome: p.range.chromosome,
                section: p.range.section,
                dataset: p.dataset.id,
            }));
        const results = await Promise.all(promises);
        return this.util.toOriginal(results, pair);
    }

    /**
     * get a dna data entry from an mapping
     * @param {database} db - database connection
     * @param {object} mapping - the mapping
     */
    async reverseLookup(db, mapping) {
        const mappings = this.util.toArray(mapping);
        const query =
            `SELECT 
                chromosome,
                strand,
                type,
                lower(section) as start,
                upper(section) as stop
             FROM dna_data_map
             WHERE dataset = $(dataset)
             AND   index = $(index)
             AND   direction = $(direction)
            `;
        const promises = mappings.map(async m => db.any(query, m));
        const results = await Promise.all(promises);
        const dna = results.map(entries =>
            entries.map(e => this.converter.dnaMapping(e, true)));
        return this.util.toOriginal(dna, mapping);
    }


    /**
     * Delete all mappings from a certain dataset
     * @param {database} db - an active database transaction, or null
     * @param {object} dataset - the dataset to delete
     * @param {integer} dataset.id - the id of the dataset
     */
    async deleteDataset(db, dataset) {
        const query =
            `DELETE from dna_data_map
            WHERE dataset = $(id)
            `;
        return db.none(query, {
            id: dataset.id,
        });
    }
}

module.exports = DnaDataMap;

