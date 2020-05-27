const LyraComponent = require('lyra-component');
const crypto = require('crypto');

class Enums extends LyraComponent {
    static requires() {
        return {
        };
    }


    async init() {
        this.logger.log('Creating enums...');
        const { enums } = this.config.static;
        this.data = {};
        enums.forEach((spec) => {
            const { name, values } = spec;
            const dicts = this.createEnum(values);
            this.data[name] = dicts;
        });
        this.logger.log('done.');
    }

    normalizeName(enumName, name) {
        const id = this.convertName(enumName, name);
        return this.convertId(enumName, id);
    }

    convertName(enumName, name) {
        if (!name) {
            return null;
        }
        const dicts = this.data[enumName.toUpperCase()];
        if (!dicts) {
            throw this.customError(
                'UnknownEnumError',
                `Enum ${enumName} does not exist`,
            );
        }
        const id = dicts.keys[name.toLowerCase()];
        if (!id) {
            throw this.customError(
                'EnumValueError',
                `Enum ${enumName} does not contain value for ${name}`,
            );
        }
        return id;
    }

    convertId(enumName, id) {
        if (!id) {
            return null;
        }
        const dicts = this.data[enumName.toUpperCase()];
        if (!dicts) {
            throw this.customError(
                'UnknownEnumError',
                `Enum ${enumName} does not exist`,
            );
        }
        const name = dicts.ids[id];
        if (!name) {
            throw this.customError(
                'EnumIdError',
                `Enum ${enumName} does not contain name for ${id}`,
            );
        }
        return name;
    }

    listNames(enumName) {
        const dicts = this.data[enumName.toUpperCase()];
        if (!dicts) {
            throw this.customError(
                'UnknownEnumError',
                `Enum ${enumName} does not exist`,
            );
        }
        return Object.keys(dicts.keys);
    }

    getUniqueId(key) {
        const hash = crypto.createHash('sha256');
        hash.update(key);
        const buffer = hash.digest();
        const id = buffer.readInt32BE();
        return id;
    }


    createEnum(values) {
        const keyDict = {};
        const idDict = {};
        values.forEach((obj) => {
            const { name, aliases } = obj;
            const id = this.getUniqueId(name);
            keyDict[name] = id;
            if (aliases && aliases.length) {
                aliases.forEach((alias) => {
                    keyDict[alias] = id;
                });
            }
            if (idDict[id]) {
                throw this.customError(
                    'HashCollisionError',
                    'Hash Collision on enum creation',
                );
            }
            idDict[id] = name;
        });
        return {
            keys: keyDict,
            ids: idDict,
        };
    }
}
module.exports = Enums;
