/* eslint-disable no-await-in-loop */
const LyraComponent = require('lyra-component');

class Interaction extends LyraComponent {
    static requires() {
        return {
            interactionSearch: 'database.InteractionSearch',
            dataset: 'database.Dataset',
            identifierSearch: 'database.IdentifierSearch',
        };
    }

    removeDuplicates(interactions) {
        const interactionDict = {};
        // Duplicates with the lowest depth should survive
        const sorted = interactions.sort((i1, i2) => i2.depth - i1.depth);
        sorted.forEach((interaction) => {
            const key = interaction.identifiers
                .map(i => i.id)
                .sort()
                .join('-');
            interactionDict[key] = interaction;
        });
        return Object.values(interactionDict);
    }

    interactionsToIdentifiers(interactions, identifier) {
        const identifierDict = {};
        interactions.forEach((interaction) => {
            interaction.identifiers.forEach((ident) => {
                identifierDict[ident.id] = {
                    ...ident,
                    weight: interaction.weight,
                };
            });
        });
        if (identifier) {
            delete identifierDict[identifier.id];
        }
        return Object.values(identifierDict);
    }

    checkOptions(options) {
        const maxDepth = 5;
        if (options.depth > maxDepth) {
            throw this.customError(
                'DepthError',
                `maximum depth is ${maxDepth}, requested ${options.depth}`,
            );
        }
        const dbOptions = {
            depth: options.depth || 1,
            limit: options.limit || 10,
            types: options.types || [],
        };
        return dbOptions;
    }

    /**
     * get interactions from a identifier
     */
    async get(db, pair, options) {
        if (!pair) {
            return null;
        }
        const { identifier, dataset } = pair;
        const { types, depth, limit } = this.checkOptions(options);
        const request = {
            identifier,
            dataset: dataset.id,
            types,
            depth,
            limit,
        };
        const interactions = await this.interactionSearch.find(db, request);
        if (options.identifiersOnly) {
            const identifiers = this.interactionsToIdentifiers(
                interactions,
                identifier,
            );
            return identifiers;
        }
        if (!options.allowDuplicates) {
            return this.removeDuplicates(interactions);
        }
        return interactions;
    }
}
module.exports = Interaction;
