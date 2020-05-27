const LyraComponent = require('lyra-component');

class InteractionSearch extends LyraComponent {
    static requires() {
        return {
            helpers: 'database.Helpers',
            converter: 'database.Converter',
        };
    }


    /**
     * convert the type of identifiers
     * @param {database} db - an actice database transaction or null,
     * @param {Object}   request - the request object
     * @param {Array}    request.identifiers - the list of identifiers matching a single id request
     */
    async convertType(db, request) {
        const requests = this.util.toArray(request);
        const coreTypes = [
            'entrez id',
            'ensembl gene id',
            'ensembl protein id',
            'ensembl transcript id',
            'gene name',
            'uniprot accession',
            'uniprot entry name',
            'affy id',
        ];
        const tRequests = requests.map(requ => ({
            ...requ,
            types: coreTypes.concat(requ.types),
            limit: 10000,
            depth: 1,
            interactionType: this.converter.idMapType('type_mapping'),
        }));
        const results = await this.findType(db, tRequests);
        return results.map((interactions, i) => {
            const r = tRequests[i];
            return {
                identifier: r.identifier,
                interactions,
            };
        });
    }

    /**
     * convert the type of a single identifier
     * @param {database} db - an actice database transaction or null,
     * @param {Object}   request - the request object
     * @param {Array}    request.identifier - the start identifier
     * @param {Array}    request.types - the ids of types to expand further
     * @param {Array}    request.targetTypes - the types to look for
     */
    async findType(db, request) {
        const requests = this.util.toArray(request);
        const dbRequests = requests.map(r => this.converter.interactionRequest(r));
        const query = `
            WITH RECURSIVE search_graph AS (
                SELECT
                    iit.*,
                    il1.name as name_1,
                    il2.name as name_2,
                    il1.type as type_1,
                    il2.type as type_2,
                    0 depth
                FROM identifier_identifier_map iit
                INNER JOIN identifier_list AS il1
                    ON (iit.identifier_1 = il1.id)
                INNER JOIN identifier_list AS il2
                    ON (iit.identifier_2 = il2.id)
                WHERE (
                    iit.identifier_1 = $(id) OR
                    iit.identifier_2 = $(id)
                ) 
                AND iit.type = $(interactionType)
                AND il1.type IN ($(types#))
                AND il2.type IN ($(types#))

            UNION ALL
                SELECT 
                    ids.*, 
                    il1.name as name_1,
                    il2.name as name_2,
                    il1.type as type_1,
                    il2.type as type_2,
                    n.depth + 1
                FROM  search_graph n,
                    identifier_identifier_map ids
                    INNER JOIN identifier_list AS il1
                        ON (ids.identifier_1 = il1.id)
                    INNER JOIN identifier_list AS il2
                        ON (ids.identifier_2 = il2.id)
            WHERE (
                    ids.identifier_1 = n.identifier_1
                 OR ids.identifier_2 = n.identifier_2
                 OR ids.identifier_1 = n.identifier_2
                 OR ids.identifier_2 = n.identifier_1
                ) 
                AND n.depth < $(depth)
                AND ids.type = $(interactionType)
                AND il1.type IN ($(types#))
                AND il2.type IN ($(types#))
            )
            SELECT * from search_graph LIMIT $(limit);
        `;
        const promises = dbRequests.map(r => db.any(query, r));
        const results = await Promise.all(promises);
        return results.map(result =>
            result.map(ia => this.converter.interaction(ia)));
    }

    /**
     * find identifiers linked to a certain identifiers
     * @param {database} db - an actice database transaction or null,
     * @param {Object}   request - the request object
     * @param {Array}    request.datasets - the list of relevant dataset ids
     * @param {integer}  request.depth - the maximum distence between identifiers
     * @param {Array}    request.types - the ids of types to expand further
     * @param {integer}  request.id - the id of the sorce identifier
     */
    async find(db, request) {
        const requests = this.util.toArray(request);
        const dbRequests = requests.map(r => this.converter.interactionRequest(r));
        // Recursive query to iterate a graph
        // Start at some none set (sourceId) and in each step set the
        // node set to the set of all neighbors of the current node set.
        const query = `
            WITH RECURSIVE search_graph AS (
                SELECT
                    iit.*,
                    il1.name as name_1,
                    il2.name as name_2,
                    il1.type as type_1,
                    il2.type as type_2,
                    0 depth
                FROM identifier_identifier_map iit
                INNER JOIN identifier_list AS il1
                    ON (iit.identifier_1 = il1.id)
                INNER JOIN identifier_list AS il2
                    ON (iit.identifier_2 = il2.id)
                WHERE (
                    iit.identifier_1 = $(id) OR
                    iit.identifier_2 = $(id)
                ) 
                AND iit.dataset = $(dataset)
                AND il1.type IN ($(types#))
                AND il2.type IN ($(types#))

            UNION ALL
                SELECT 
                    ids.*, 
                    il1.name as name_1,
                    il2.name as name_2,
                    il1.type as type_1,
                    il2.type as type_2,
                    n.depth + 1
                FROM  search_graph n,
                    identifier_identifier_map ids
                    INNER JOIN identifier_list AS il1
                        ON (ids.identifier_1 = il1.id)
                    INNER JOIN identifier_list AS il2
                        ON (ids.identifier_2 = il2.id)
            WHERE (
                    ids.identifier_1 = n.identifier_1
                 OR ids.identifier_2 = n.identifier_2
                 OR ids.identifier_1 = n.identifier_2
                 OR ids.identifier_2 = n.identifier_1
                ) 
                AND n.depth < $(depth)
                AND ids.dataset = $(dataset)
                AND n.type_1 IN ($(types#))
                AND il1.type IN ($(types#))
                AND il2.type IN ($(types#))
            )
            SELECT * from search_graph LIMIT $(limit);
        `;
        const promises = dbRequests.map(r => db.any(query, r));
        const results = await Promise.all(promises);
        const interactions = results.map(result =>
            result.map(ia => this.converter.interaction(ia)));
        return this.util.toOriginal(interactions, request);
    }
}

module.exports = InteractionSearch;
