/* eslint-disable class-methods-use-this */
const LyraComponent = require('lyra-component');

class Util extends LyraComponent {
    static requires() {
        return {
            customError: 'default.CustomError',
        };
    }

    toArray(value) {
        if (Array.isArray(value)) {
            return value;
        }
        return [value];
    }


    toOriginal(results, input) {
        if (Array.isArray(input)) {
            return results;
        }
        return results[0];
    }

    toSingle(value) {
        if (!Array.isArray(value)) {
            return value;
        }
        if (value.length === 0) {
            return null;
        }
        if (value.length !== 1) {
            throw this.customError(
                'ArrayConversionError',
                `Cannot convert array ${JSON.stringify(value)} to single value,
                 multiple entries`,
            );
        }
        return value[0];
    }


    /**
     * convert an array of objects into a dictionary
     * @param {array} array - an array of objects
     * @param {string} key  - a key appearing in every object
     * @param {boolean} multiple - are there multiple objects with the same key,
     *                             if true will put them in arrays
     */
    arrayToDict(array, key, multiple) {
        return array.reduce((accum, elem) => {
            const tmp = accum;
            if (multiple) {
                if (!tmp[elem[key]]) {
                    tmp[elem[key]] = [];
                }
                tmp[elem[key]].push(elem);
            } else {
                tmp[elem[key]] = elem;
            }
            return tmp;
        }, {});
    }

    cleanObj(obj) {
        const tmp = obj;
        Object.keys(obj).forEach((key) => {
            if (!obj[key]) {
                delete tmp[key];
            }
        });
        return tmp;
    }

    async delay(milliseconds) {
        return new Promise(resolve => setTimeout(() => resolve(), milliseconds));
    }

    pick(obj, ...props) {
        return Object.assign({}, ...props.map(prop => ({ [prop]: obj[prop] })));
    }
}
module.exports = Util;

