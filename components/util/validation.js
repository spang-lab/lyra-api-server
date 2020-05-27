
/* eslint-disable class-methods-use-this */
const LyraComponent = require('lyra-component');
/**
 * Form input validation
 * @memberof module:util
 * @class
 */
class Validation extends LyraComponent {
    /**
     * checks if the value is a valid string
     * @param {String} text - the text to check
     * @param {Number} maxLength - maximum allowed length
     */
    isText(text, minLength = 1, maxLength = 64) {
        if (typeof text !== 'string') {
            return false;
        }
        if (text.length < minLength || text.length > maxLength) {
            return false;
        }
        return true;
    }
    /**
     * checks if the value is a numeric id no cast since
     * ids can exceed int_max
     * @param {String} value - the value to test
     */
    isInteger(value) {
        let text = value;
        if (typeof text === 'number') {
            text = text.toString();
        }
        if (typeof text !== 'string') {
            return false;
        }
        const re = /^[0-9]+$/;
        return re.test(text);
    }

    isObject(value) {
        return typeof value === 'object' && !Array.isArray(value);
    }
}
module.exports = Validation;

