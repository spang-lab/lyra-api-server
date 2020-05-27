
const LyraComponent = require('lyra-component');

class Route extends LyraComponent {
    get() {
        return (ctx) => {
            process.send('insert');
            ctx.body = 'insert started';
        };
    }
}
module.exports = Route;
