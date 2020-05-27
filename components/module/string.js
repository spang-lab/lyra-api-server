/* eslint-disable class-methods-use-this */
const LyraComponent = require('lyra-component');


class StringApi extends LyraComponent {
    static requires() {
        return {
            https: 'module.Https',
            interaction: 'module.Interaction',
            search: 'database.IdentifierSearch',
            converter: 'database.Converter',
        };
    }


    constructor(dependencies) {
        super(dependencies);
        this.host = 'https://string-db.org/api';
    }

    async getInteractions(db, identifiers, species, params) {
        const ids = await this.getStringIds(identifiers, species);
        const rawInteractions = await this.getInteractionPartners(ids, params);
        const interactions = await this.processInteractions(db, rawInteractions);
        if (params.identifiersOnly) {
            return this.interaction.interactionsToIdentifiers(
                interactions,
                identifiers[0],
            );
        }
        return interactions;
    }

    async getStringIds(identifiers, species) {
        const childPath = '/json/get_string_ids';
        const speciesMap = {
            'mus musculus': 10090,
            'homo sapiens': 9606,
        };
        const params = {
            identifiers: identifiers.map(id => id.name).join('\r'),
            species: speciesMap[species],
            limit: 1,
        };
        const result = await this.https.get(
            this.host,
            childPath,
            params,
        );
        return result;
    }

    async getInteractionPartners(stringIds, options) {
        if (!stringIds.length) {
            return [];
        }
        const childPath = '/json/network';
        const params = {
            identifiers: stringIds.map(r => r.stringId).join('\r'),
            limit: options.limit || 10,
        };
        const result = await this.https.get(
            this.host,
            childPath,
            params,
        );
        return result;
    }

    async processInteractions(db, interactions) {
        const scoreMap = {
            ascore: 'coexpression',
            nscore: 'neighbor',
            fscore: 'fusion',
            pscore: 'coocurence',
            escore: 'experiments',
            dscore: 'databases',
            tscore: 'textmining',
        };


        const promises = interactions.map(async (interaction, i) => {
            const queries = [{
                name: interaction.preferredName_A,
                type: 'gene name',
            }, {
                name: interaction.preferredName_B,
                type: 'gene name',
            }];
            const searchResults = await this.search.find(
                db,
                queries,
                { exact: true },
            );
            const identifiers = searchResults
                .map(r => r.result[0])
                .filter(r => r)
                .map(id => this.converter.identifier(id, true));
            if (identifiers.length !== 2) {
                return null;
            }
            const result = {
                id: `string_${i}`,
                identifiers,
                weight: 0,
                type: 'string_interaction',
            };
            Object.keys(scoreMap).forEach((key) => {
                const label = scoreMap[key];
                result[label] = interaction[key];
            });
            return result;
        });
        const results = await Promise.all(promises);
        return results.filter(r => r);
    }
}

module.exports = StringApi;
