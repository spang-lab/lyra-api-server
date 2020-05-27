

const LyraComponent = require('lyra-component');


class MatchIdentifier extends LyraComponent {
    static requires() {
        return {
            converter: 'database.Converter',
            idConvert: 'module.IdConvert',
        };
    }

    get() {
        return async (ctx, next) => {
            const { db, identifiers, dataset } = ctx.state;
            const pairs = await this.getPairs(db, identifiers, dataset);
            ctx.state.pairs = pairs;
            await next();
        };
    }

    async getPairs(db, identifiers, dataset) {
        if (!identifiers || !dataset || !identifiers.length) {
            throw this.customError(
                'InvalidRequestDataError',
                `req.data is invalid. Data: ${JSON.stringify({ identifiers, dataset })}`,
            );
        }
        const mappings = [];
        identifiers.forEach((candidates) => {
            mappings.push({
                candidates,
                dataset,
            });
        });
        const promises = mappings.map(async mapping =>
            this.findMapping(db, mapping.candidates, mapping.dataset));
        const results = await Promise.all(promises);
        return results;
    }


    getDirection(identifier, dataset) {
        if (identifier.type === dataset.row_id_type) {
            return this.converter.direction('row');
        }
        return this.converter.direction('col');
    }

    async findMapping(db, candidate, dataset) {
        const candidates = this.util.toArray(candidate);
        if (!dataset) {
            throw this.customError(
                'InvalidDatasetError',
                'No matching dataset found',
            );
        }
        if (dataset.type === this.converter.datasetType('annotation')) {
            return this.findAnnotationMapping(db, candidates, dataset);
        }
        if (dataset.type === this.converter.datasetType('identifier_mapping')) {
            return this.findInteractionMapping(db, candidates, dataset);
        }

        return this.findMatrixMapping(db, candidates, dataset);
    }

    async findMatrixMapping(db, candidates, dataset) {
        const types = [dataset.row_id_type, dataset.col_id_type];
        const match = candidates.find(c => types.includes(c.type));
        if (match) {
            return {
                identifier: match,
                dataset,
                direction: this.getDirection(match, dataset),
            };
        }
        const typeNames = types.map(t => this.converter.type(t, true));
        const converted = await this.idConvert.get(db, {
            identifiers: candidates,
            types: typeNames,
        });
        const { targets } = converted[0];
        if (!targets || !targets.length) {
            throw this.customError(`No pair found
                for identifiers ${JSON.stringify(candidates)}
                and dataset ${JSON.stringify(dataset)}`);
        }
        const target = targets[0];
        const identifier = this.converter.identifier(target);
        return {
            identifier,
            dataset,
            direction: this.getDirection(identifier, dataset),
        };
    }

    async findInteractionMapping(db, candidates, dataset) {
        if (!candidates.length) {
            return null;
        }
        if (candidates.length > 1) {
            throw this.customError(
                'NonUniqueIdentifier',
                `Multiple candidates for identifier: ${JSON.stringify(candidates)}`,
            );
        }
        return {
            identifier: candidates[0],
            dataset,
        };
    }

    async findAnnotationMapping(db, candidates, dataset) {
        const typeNames = [
            'gene name',
            'ensembl gene id',
            'ensembl transcript id',
            'ensembl exon id',
        ];
        const types = typeNames.map(n => this.converter.type(n));
        const match = candidates.find(c => types.includes(c.type));
        if (match) {
            return {
                identifier: match,
                dataset,
                direction: this.converter.direction('row'),
            };
        }
        // TODO convert
        return null;
    }
}
module.exports = MatchIdentifier;
