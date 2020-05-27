const LyraComponent = require('lyra-component');

class Search extends LyraComponent {
    static requires() {
        return {
            identifierSearch: 'database.IdentifierSearch',
            converter: 'database.Converter',
            constants: 'util.Constants',
            dbToken: 'database.Token',
        };
    }

    async query(db, queries, options, species) {
        const responses = await this.identifierSearch.find(
            db,
            queries,
            options,
        );
        const identifiers = responses.map((response) => {
            const { result } = response;
            return result
                .map(r => this.converter.identifier(r, true))
                .map(id => this.calculateScore(id, species))
                .filter(id => id.score)
                .sort(this.compareScore);
        });
        return identifiers;
    }

    compareScore(a, b) {
        return b.score - a.score;
    }

    calculateScore(identifier, species) {
        const weights = this.constants.get('TYPE_WEIGHT');
        const weight = weights[identifier.type] || 0;
        let score = (identifier.sml * 100) + weight;
        if (identifier.type === 'gene name') {
            const gSpecies = this.geneSpecies(identifier);
            if (gSpecies !== species) {
                score = null;
            }
        }
        return {
            ...identifier,
            score,
        };
    }

    geneSpecies(identifier) {
        const { name } = identifier;
        if (/[a-z]/.test(name)) {
            return 'mus musculus';
        }
        return 'homo sapiens';
    }

    async id(db, identifiers, tId) {
        const uIdentifiers = identifiers.map(
            id => this.converter.identifier(id, true),
        );
        const token = {
            data: uIdentifiers,
            key: tId,
            type: 'search',
            lifetime: '3d',
        };
        const result = await this.dbToken.add(db, token);
        return result;
    }

    async token(db, token) {
        const result = await this.dbToken.get(db, {
            type: 'search',
            token,
        });
        return result;
    }


    async history() {
        const results = []; // TODO
        const sResults = results
            .filter(r => r.type === 'searchResult')
            .sort((a, b) => new Date(b.created) - new Date(a.created))
            .map(r => r.data);
        const identifiers = [].concat(...sResults);
        const identifierDict = {};
        identifiers.forEach((identifier) => {
            identifierDict[identifier.id] = identifier;
        });
        return Object.values(identifierDict);
    }

    async fromToken() {
        // TODO
        return null;
    }
}
module.exports = Search;
