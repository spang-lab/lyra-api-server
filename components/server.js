/* eslint-disable no-unused-vars */
const LyraComponent = require('lyra-component');
const path = require('path');

const Koa = require('koa');
const favicon = require('koa-favicon');
const session = require('koa-session');
const helmet = require('koa-helmet');
const cors = require('@koa/cors');
const BodyParser = require('koa-body');

class ServerProcess extends LyraComponent {
    static requires() {
        return {
            connection: 'database.Connection',
            apiRouter: 'router.ApiRouter',
            errorMiddleware: 'middleware.ErrorMiddleware',
            notFoundMiddleware: 'middleware.NotFound',
            logMiddleware: 'middleware.LogMiddleware',
            sessionMiddleware: 'middleware.Session',
        };
    }


    async run() {
        const app = new Koa();
        app.keys = [this.config.secrets.cookieSecret];
        app.use(this.logMiddleware.get());
        app.use(this.errorMiddleware.get());
        app.use(this.notFoundMiddleware.get());
        app.use(this.sessionMiddleware.get(app));
        app.use(helmet());
        app.use(cors());

        const faviconPath = path.join(this.config.rootPath, 'favicon.ico');
        app.use(favicon(faviconPath));

        const bodyParser = new BodyParser();
        app.use(bodyParser);

        const apiRoutes = this.apiRouter.get().routes();
        app.use(apiRoutes);

        const { port } = this.config.server;
        app.listen(port);
        console.log(`Listening on port ${port}`);

        process.on('disconnect', () => {
            this.connection.terminate();
        });
    }
}
module.exports = ServerProcess;
