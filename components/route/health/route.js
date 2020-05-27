const LyraComponent = require('lyra-component');

class Route extends LyraComponent {
    get() {
        return async (ctx) => {
            ctx.body = 'healthy';
        };
    }
}
module.exports = Route;
