/* eslint-disable no-console */
const LyraComponent = require('lyra-component');
/**
 * Show only critical errors
 */
const LOG_LEVEL_QUIET = 0;
/**
 * show only errors
 */
const LOG_LEVEL_ERROR = 1;
/**
 * also show warnings
 */
const LOG_LEVEL_WARN = 2;
/**
 * also show important log messages, sane default
 */
const LOG_LEVEL_IMPORTANT = 3;

/**
 * also show normal log messages, sane default
 */
const LOG_LEVEL_INFO = 4;
/**
 * show all log messages
 */
const LOG_LEVEL_VERBOSE = 5;

/**
 * Termial color code, resets the color
 */
const COLOR_RESET = '\x1b[0m';
/**
 * Termial color code, sets the color to red
 */
const COLOR_RED = '\x1b[31m';
/**
 * Termial color code, sets the color to yellow
 */
const COLOR_YELLOW = '\x1b[33m';
/**
 * Termial color code, sets the color to cyan
 */
const COLOR_CYAN = '\x1b[36m';

/**
 * Termial color code, sets the color to purple
 */
const COLOR_MAGENTA = '\x1b[35m';

/**
 * Termial color code, sets the color to green
 */
const COLOR_GREEN = '\x1b[32m';


/**
 * Class the handles output to stdout and stderr
 * @class
 */
class Logger extends LyraComponent {
    static requires() {
        return {
            config: 'default.Config',
        };
    }

    /**
     * Send a message to the console with a certain log level
     * if we set a lower log level than the message it will be ignored
     * @param {integer} logLevel - the log level, lower is more critical
     * @param {string[]} args - the messages to print
     */
    message(logLevel, ...args) {
        if (logLevel > this.config.server.logLevel) {
            return;
        }
        const time = new Date().toLocaleTimeString();
        let color = COLOR_RESET;
        if (logLevel === LOG_LEVEL_IMPORTANT) {
            color = COLOR_MAGENTA;
        }
        if (logLevel === LOG_LEVEL_WARN) {
            color = COLOR_YELLOW;
        }
        if (logLevel === LOG_LEVEL_ERROR) {
            color = COLOR_RED;
        }
        const arr = [time, '>>', color]
            .concat(args);
        arr.push(COLOR_RESET);
        console.log(...arr);
    }

    /**
     * Shorthand method for calling message(..., ...args)
     * @param {string[]} args - the messages to print
     */
    panic(...args) {
        this.message(LOG_LEVEL_QUIET, ...args);
    }

    /**
     * Shorthand method for calling message(..., ...args)
     * @param {string[]} args - the messages to print
     */
    error(...args) {
        this.message(LOG_LEVEL_ERROR, ...args);
    }

    /**
     * Shorthand method for calling message(..., ...args)
     * @param {string[]} args - the messages to print
     */
    warn(...args) {
        this.message(LOG_LEVEL_WARN, ...args);
    }

    /**
     * Shorthand method for calling message(..., ...args)
     * @param {string[]} args - the messages to print
     */
    important(...args) {
        this.message(LOG_LEVEL_IMPORTANT, ...args);
    }

    /**
     * Shorthand method for calling message(..., ...args)
     * @param {string[]} args - the messages to print
     */
    log(...args) {
        this.message(LOG_LEVEL_INFO, ...args);
    }

    /**
     * Shorthand method for calling message(..., ...args)
     * @param {string[]} args - the messages to print
     */
    verbose(...args) {
        this.message(LOG_LEVEL_VERBOSE, ...args);
    }

    /**
     * Log something with a big outline
     * @param {string} color - the terminal color
     * @param {string[]} args - the messages to print
     */
    logBigColor(color, ...args) {
        this.message(
            LOG_LEVEL_INFO,
            color,
            '+----------------------------------------------------------------+',
        );
        const message = args.join(' ');
        const spacing = (60 - message.length) / 2;
        this.message(
            LOG_LEVEL_INFO,
            color,
            '|',
            ' '.repeat(Math.floor(spacing)),
            message.toUpperCase(),
            ' '.repeat(Math.ceil(spacing)),
            '|',
        );
        this.message(
            LOG_LEVEL_INFO,
            color,
            '+----------------------------------------------------------------+',
        );
    }

    dbg(...args) {
        this.verbose('------- DEBUG');
        const string = args.map((arg) => JSON.stringify(arg, null, 2)).join('\n\n');
        this.verbose(string);
        this.verbose('-------------');
    }
    /**
     * Log something with a big outline
     * @param {string[]} args - the messages to print
     */

    logBig(...args) {
        this.logBigColor(COLOR_RESET, ...args);
    }

    /**
     * Log something big and in green
     * @param {string[]} args - the messages to print
     */
    logBigSuccess(...args) {
        this.logBigColor(COLOR_GREEN, ...args);
    }

    /**
     * Calculate the progress in percent and log it
     */
    logProgress(index, total) {
        const previous = Math.floor((index * 100) / total);
        const current = Math.floor(((index + 1) * 100) / total);
        if (current > previous || index === 0) {
            const message = `Progress: ${current} Percent complete.`;
            if (current % 10 === 0) {
                this.log(COLOR_CYAN, message, COLOR_RESET);
                return;
            }
            this.verbose(COLOR_RESET, message);
        }
    }
}
module.exports = Logger;
