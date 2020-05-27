/* eslint-disable class-methods-use-this */
const LyraComponent = require('lyra-component');


class NcbiApi extends LyraComponent {
    static requires() {
        return {
            https: 'module.Https',
            converter: 'database.Converter',
        };
    }

    constructor(dependencies) {
        super(dependencies);
        this.apiKey = this.config.secrets.ncbiApiKey;
        this.host = 'https://eutils.ncbi.nlm.nih.gov';
    }


    async findGeneName(name, species) {
        const result = await this.getESearch(name, 'gene name', species);
        if (!result ||
           !result.esearchresult ||
           !result.esearchresult.idlist ||
           !result.esearchresult.idlist.length) {
            throw this.customError(
                'NameNotFoundError',
                `Gene name ${name} not found on ncbi`,
            );
        }
        const ncbiId = result.esearchresult.idlist[0];
        const summary = await this.getESummary([ncbiId]);
        return this.converter.ncbi(summary[ncbiId]);
    }


    async getESearch(name, type, species) {
        const childPath = '/entrez/eutils/esearch.fcgi';
        const params = {
            api_key: this.apiKey,
            db: 'gene',
            retmode: 'json',
            term: `${name}[${type}] AND ${species}[Organism]`,
        };
        const result = await this.https.get(this.host, childPath, params);
        return result;
    }

    async getESummary(ids) {
        const childPath = '/entrez/eutils/esummary.fcgi';
        const params = {
            api_key: this.apiKey,
            db: 'gene',
            retmode: 'json',
            id: ids.join(','),
        };
        const result = await this.https.get(this.host, childPath, params);
        return result.result;
    }
}
module.exports = NcbiApi;
