/* eslint-disable no-console */
const LyraComponent = require('lyra-component');


const COLOR_CYAN = '\x1b[36m';
const COLOR_RESET = '\x1b[0m';

class Debug extends LyraComponent {
    getInjectPayload() {
        return (...args) => {
            args.forEach((arg) => {
                const json = JSON.stringify(arg, null, 2);
                const text = json.replace(/\n/g, `${COLOR_RESET}\n${COLOR_CYAN}`);
                console.log(`${COLOR_CYAN}${text}\n`);
            });
        };
    }
}

module.exports = Debug;
