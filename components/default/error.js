/* eslint-disable class-methods-use-this */
const LyraComponent = require('lyra-component');

class CError extends Error {
    constructor(name, message) {
        super(message);
        this.name = name;
        if (typeof Error.captureStackTrace === 'function') {
            Error.captureStackTrace(this, this.constructor);
        } else {
            this.stack = (new Error(message)).stack;
        }
    }
}

class CustomError extends LyraComponent {
    getInjectPayload() {
        return (name, message) => new CError(name, message);
    }
}


module.exports = CustomError;
