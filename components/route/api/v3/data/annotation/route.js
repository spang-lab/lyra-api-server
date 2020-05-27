
const LyraComponent = require('lyra-component');

class Route extends LyraComponent {
    static requires() {
        return {
            annotation: 'module.Annotation',
        };
    }

    get() {
        return async (ctx) => {
            const { db, pairs } = ctx.state;
            const { options } = ctx.request.body;
            const result = await this.annotation.get(db, pairs, options);
            ctx.body = result;
        };
    }
}
module.exports = Route;
