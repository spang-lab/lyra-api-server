const LyraComponent = require('lyra-component');


class Resolve extends LyraComponent {
    static requires() {
        return {
            converter: 'database.Converter',
            enums: 'util.Enums',
            validation: 'util.Validation',
            identifierSearch: 'database.IdentifierSearch',
            dataset: 'database.Dataset',
        };
    }


    get() {
        return async (ctx, next) => {
            const { body } = ctx.request;
            const { db } = ctx.state;
            if (!body) {
                await next();
                return;
            }
            const data = {
                species: await this.species(db, body.species),
                dataset: await this.datasets(db, body.dataset),
                identifiers: await this.identifiers(db, body.identifiers),
                dna: await this.dna(db, body.dna),
            };
            ctx.state = {
                ...ctx.state,
                ...data,
            };
            await next();
        };
    }

    species(db, input) {
        if (!input) {
            return null;
        }
        if (!this.validation.isText(input)) {
            throw this.customError(
                'InvalidSpeciesError',
                `Species should be a string, but is ${JSON.stringify(input)}`,
            );
        }
        const species = this.enums.normalizeName('TAXONOMY', input);
        return species;
    }

    async identifiers(db, identifier) {
        if (!identifier) {
            return null;
        }
        const identifiers = this.util.toArray(identifier)
            .map((id) => {
                if (this.validation.isInteger(id)) {
                    return {
                        id,
                    };
                }
                if (this.validation.isText(id)) {
                    return {
                        name: id,
                    };
                }
                if (this.validation.isObject(id)) {
                    return id;
                }
                throw this.customError(
                    'InvalidIdentifierError',
                    `Identifier Format not recognized, identifiers is ${JSON.stringify(identifier)}`,
                );
            });
        const options = { exact: true };
        const entries = await this.identifierSearch.find(db, identifiers, options);
        const results = entries.map(e => e.result);
        return results;
    }

    async datasets(db, dataset) {
        let results = null;
        if (!dataset) {
            return null;
        }
        if (this.validation.isInteger(dataset)) {
            results = await this.dataset.findBy(
                db,
                { id: dataset },
            );
        }
        if (this.validation.isText(dataset)) {
            results = await this.dataset.findBy(
                db,
                { name: dataset },
            );
        }
        if (this.validation.isObject(dataset)) {
            results = await this.dataset.findBy(
                db,
                dataset,
            );
        }
        if (!results || !results.length) {
            return null;
        }
        return results[0];
    }

    async dna(db, dna) {
        if (!dna) {
            return null;
        }
        const entries = this.util.toArray(dna);
        const results = entries.map(entry => ({
            ...entry,
            chromosome: entry.chromosome.toString(),
            section: `[${entry.start},${entry.stop}]`,
        }));
        return results;
    }
}
module.exports = Resolve;
