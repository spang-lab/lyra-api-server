
const LyraComponent = require('lyra-component');

class IdConvert extends LyraComponent {
    static requires() {
        return {
            interactionSearch: 'database.InteractionSearch',
            interaction: 'module.Interaction',
            converter: 'database.Converter',
            dataset: 'database.Dataset',
        };
    }


    async get(db, request) {
        const { identifiers, types } = request;
        let typeList = this.util.toArray(types);
        if(!types) {
            typeList = [];
        }
        const requests = identifiers.map(ids => ({
            identifier: this.util.toSingle(ids),
            types: typeList,
        })).filter(i => i.identifier);
        const results = await this.interactionSearch.convertType(
            db,
            requests,
        );
        return results.map((result) => {
            const interactions = this.interaction.removeDuplicates(result.interactions);
            const targets = this.findTargets(interactions, typeList);
            return {
                identifier: result.identifier,
                targets,
            };
        });
    }

    findTargets(interactions, targetTypes) {
        if(targetTypes.length === 0) {
            return interactions;
        }
        for (let depth = 0; depth <= 1; depth += 1) {
            const lInteractions = interactions.filter(i => i.depth === depth);
            const results = lInteractions.map((ia) => {
                const matches = ia.identifiers.filter(identifier =>
                    targetTypes.includes(identifier.type));
                if (matches.length) {
                    return matches[0];
                }
                return null;
            }).filter(r => r);
            if (results.length) {
                return results;
            }
        }
        return null;
    }
}
module.exports = IdConvert;
