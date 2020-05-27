
const LyraComponent = require('lyra-component');

class Constants extends LyraComponent {
    static requires() {
        return {
        };
    }

    async init() {
        this.logger.verbose('Reading constants...');
        const { constants } = this.config.static;
        this.data = {};
        constants.forEach((constant) => {
            this.data[constant.name] = constant.values;
        });
        this.logger.verbose('Done.');
    }

    get(name) {
        return this.data[name];
    }
}

module.exports = Constants;
