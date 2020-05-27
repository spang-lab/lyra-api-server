
const LyraComponent = require('lyra-component');
/**
 * Convert enum types
 * @memberof module:Database
 * @class
 */
class Converter extends LyraComponent {
    static requires() {
        return {
            helpers: 'database.Helpers',
            enums: 'util.Enums',
        };
    }

    toSnakeCase(string) {
        return string.replace(/([A-Z])/g, '_$1').toLowerCase();
    }

    toCamelCase(string) {
        return string.replace(/_(.)/g, (match, p1) => p1.toUpperCase());
    }

    convertCase(obj, reverse = false) {
        const newObj = {};
        let fun = s => this.toSnakeCase(s);
        if (reverse) {
            fun = s => this.toCamelCase(s);
        }
        Object.keys(obj).forEach((key) => {
            newObj[fun(key)] = obj[key];
        });
        return newObj;
    }


    getConvertFunction(enumName, reverse) {
        if (reverse) {
            return id => this.enums.convertId(enumName, id);
        }
        return name => this.enums.convertName(enumName, name);
    }

    type(type, reverse = false) {
        const fun = this.getConvertFunction('IDENTIFIER_TYPE', reverse);
        return fun(type);
    }

    taxonomy(taxonomy, reverse = false) {
        const fun = this.getConvertFunction('TAXONOMY', reverse);
        return fun(taxonomy);
    }

    access(access, reverse = false) {
        const fun = this.getConvertFunction('ACCESS_LEVEL', reverse);
        return fun(access);
    }

    direction(direction, reverse = false) {
        const fun = this.getConvertFunction('DIRECTION', reverse);
        return fun(direction);
    }

    strand(direction, reverse = false) {
        const fun = this.getConvertFunction('DNA_STRAND', reverse);
        return fun(direction);
    }

    datasetType(type, reverse = false) {
        const fun = this.getConvertFunction('DATASET_TYPE', reverse);
        return fun(type);
    }

    dnaMapType(type, reverse = false) {
        const fun = this.getConvertFunction('DNA_MAP_TYPE', reverse);
        return fun(type);
    }

    idMapType(type, reverse = false) {
        const fun = this.getConvertFunction('ID_MAP_TYPE', reverse);
        return fun(type);
    }

    tokenType(type, reverse = false) {
        const fun = this.getConvertFunction('TOKEN_TYPE', reverse);
        return fun(type);
    }


    dataset(dataset, reverse = false) {
        const snakeDataset = this.convertCase(dataset, false);

        const cDataset = {
            ...snakeDataset,
            type: this.datasetType(snakeDataset.type, reverse),
            access: this.access(snakeDataset.access, reverse),
            row_id_type: this.type(snakeDataset.row_id_type, reverse),
            col_id_type: this.type(snakeDataset.col_id_type, reverse),
            species: this.taxonomy(snakeDataset.species, reverse),
            last_modified: 'now',
        };
        return this.convertCase(cDataset, reverse);
    }

    dataMapping(mapping, reverse = false) {
        const sMapping = this.convertCase(mapping, false);
        const dbMapping = {
            ...sMapping,
            direction: this.direction(sMapping.direction, reverse),
        };
        return this.convertCase(dbMapping, reverse);
    }

    dnaMapping(mapping, reverse = false) {
        const sMapping = this.convertCase(mapping, false);
        const dbMapping = {
            ...sMapping,
            strand: this.strand(sMapping.strand, reverse),
            type: this.dnaMapType(sMapping.type, reverse),
            direction: this.direction(sMapping.direction, reverse),
        };
        return this.convertCase(dbMapping, reverse);
    }

    idMapping(mapping, reverse = false) {
        const sMapping = this.convertCase(mapping, false);
        const dbMapping = {
            ...sMapping,
            type: this.idMapType(sMapping.type, reverse),
        };
        return this.convertCase(dbMapping, reverse);
    }

    identifier(identifier, reverse = false) {
        const dbIdentifier = {
            ...identifier,
            type: this.type(identifier.type, reverse),
        };
        return dbIdentifier;
    }

    data(mapping) {
        if (!mapping) {
            return null;
        }
        const directions = {
            fDirection: 'row',
            rDirection: 'col',
            fIndex: 'row_index',
            rIndex: 'col_index',
        };
        if (mapping.direction ===
            this.direction('col')) {
            directions.fDirection = 'col';
            directions.rDirection = 'row';
            directions.fIndex = 'col_index';
            directions.rIndex = 'row_index';
        }
        const result = { ...directions };
        ['fDirection', 'rDirection'].forEach((key) => {
            result[key] = this.direction(directions[key]);
        });
        return {
            ...mapping,
            ...result,
        };
    }

    index(entry, mapping) {
        const result = { ...entry };
        delete result.index;
        if (mapping.direction === this.direction('row')) {
            result.row_index = mapping.index;
            result.col_index = entry.index;
        } else {
            result.row_index = entry.index;
            result.col_index = mapping.index;
        }
        return result;
    }

    token(token, reverse = false) {
        return {
            ...token,
            type: this.tokenType(token.type, reverse),
            created: 'now',
        };
    }

    ncbi(summary) {
        const genomicDataList = summary.genomicinfo || [];
        const genomicData = genomicDataList[0] || {};
        const speciesData = summary.organism || {};

        const data = {
            fullName: summary.nomenclaturename || '',
            chromosome: summary.chromosome || '',
            start: genomicData.chrstart || '',
            stop: genomicData.chrstop || '',
            exons: genomicData.exoncount || '',
            aliases: summary.otheraliases || '',
            names: summary.otherdesignations.split('|').join(', '),
            summary: summary.summary || '',
            ncbiId: summary.uid,
            species: `${speciesData.scientificname} (${speciesData.commonname})`,
            source: 'https://www.ncbi.nlm.nih.gov',
        };
        return data;
    }

    interactionRequest(request) {
        const typeIds = request.types.map(t => this.type(t));
        typeIds.push(request.identifier.type);
        const types = this.helpers.csv(typeIds);
        const dbRequest = {
            ...request,
            id: request.identifier.id,
            types,
        };
        return dbRequest;
    }

    interaction(dbInteraction) {
        const identifiers = [{
            id: dbInteraction.identifier_1,
            type: dbInteraction.type_1,
            name: dbInteraction.name_1,
        }, {
            id: dbInteraction.identifier_2,
            type: dbInteraction.type_2,
            name: dbInteraction.name_2,
        }];
        return {
            weight: dbInteraction.weight,
            type: this.idMapType(dbInteraction.type, true),
            depth: dbInteraction.depth,
            identifiers: identifiers.map(i => this.identifier(i, true)),
        };
    }
}
module.exports = Converter;
