const yaml = require('js-yaml');
const LyraComponent = require('lyra-component');

class HeaderParser extends LyraComponent {
    static requires() {
        return {
            enums: 'util.Enums',
        };
    }

    async read(file) {
        return new Promise((resolve, reject) => {
            const oneMb = 1048576; // Bytes
            this.logger.log('checking file size...');
            if (file.header.size > oneMb) {
                reject(this.customError(
                    'HeaderSizeError',
                    'header file size too big, > 1Mb',
                ));
                return;
            }
            this.logger.log('reading stream...');
            let dataString = '';
            file.stream.on('data', (chunk) => {
                const part = chunk.toString();
                dataString += part;
            });
            file.stream.on('end', async () => {
                this.logger.log('parsing yml...');
                try {
                    const config = yaml.safeLoad(dataString);
                    await this.validate(config);
                    this.logger.log('header valid');
                    resolve(config);
                } catch (e) {
                    reject(e);
                }
            });
        });
    }

    async validate(config) {
        const identifierTypes = await this.enums.listNames('IDENTIFIER_TYPE');
        const type = await this.enums.listNames('DATASET_TYPE');
        const species = await this.enums.listNames('TAXONOMY');
        const schema = {
            name: 'alphanumeric',
            displayName: 'string',
            type,
            access: 'string',
            description: 'string',
            data: 'any',
            rowIdType: identifierTypes,
            colIdType: identifierTypes,
            numRows: 'integer',
            numCols: 'integer',
            species,
        };
        if (config.version === '1') {
            if (!config.dataset || typeof config.dataset !== 'object') {
                throw this.customError(
                    'InvalidConfigFormat',
                    'missing dataset key',
                );
            }
            Object.keys(schema).forEach((key) => {
                if (schema[key] === 'stringOrNull' ||
                    schema[key] === 'any') {
                    return;
                }
                if (config.dataset[key] === undefined) {
                    throw this.customError(
                        'MissingInformationError',
                        `Missing required configuration field: ${key}`,
                    );
                }
            });
            Object.keys(config.dataset).forEach((key) => {
                const blueprint = schema[key];
                const value = config.dataset[key];
                if (!blueprint) {
                    this.logger.warn(`Ignoring unknown configuration option ${key}`);
                    return;
                }
                if (typeof blueprint === 'string') {
                    let valid = false;
                    const re = /^\w+$/;
                    switch (blueprint) {
                    case 'stringOrNull':
                        valid = typeof value === 'string' || !value;
                        break;
                    case 'string':
                        valid = typeof value === 'string';
                        break;
                    case 'integer':
                        valid = typeof value === 'number' && Number.isInteger(value);
                        break;
                    case 'any':
                        valid = true;
                        break;
                    case 'alphanumeric':
                        this.logger.log(value);
                        valid = typeof value === 'string' && re.test(value);
                        break;
                    default:
                        valid = false;
                    }
                    if (!valid) {
                        throw this.customError(
                            'InvalidConfigError',
                            `Invalid configuration value, 
                            ${key} should be a ${blueprint} but is ${value}`,
                        );
                    }
                    return;
                }
                if (Array.isArray(blueprint)) {
                    if (!blueprint.includes(config.dataset[key])) {
                        throw this.customError(
                            'InvalidConfigError',
                            `Invalid configuration value,
                            ${key} should be one of [${blueprint.join(', ')}], but is ${value}`,
                        );
                    }
                    return;
                }
                throw this.customError(
                    'InvalidBlueprintError',
                    '',
                );
            });

            return;
        }
        throw this.customError(
            'UnknownVersionError',
            `Cannot parse config file with version ${config.version}`,
        );
    }
}
module.exports = HeaderParser;
