const LyraComponent = require('lyra-component');
const Router = require('koa-router');
/**
 * Resolves api route
 * @memberof module:Routers
 * @class
 */
class ApiRouter extends LyraComponent {
    static requires() {
        return {
            middleware: /middleware\..*/,
            routes: /route\..*/,
        };
    }

    init() {
        const { middleware, routes } = this;

        const router = new Router();
        router.use(middleware.ApiPath.get());
        router.use(middleware.ApiResponse.get());

        const apiRouter = new Router();

        const adminRouter = this.getAdminRouter();
        apiRouter.use(
            '/admin',
            adminRouter.routes(),
            adminRouter.allowedMethods(),
        );

        const searchRouter = this.getSearchRouter();
        apiRouter.use(
            '/search',
            searchRouter.routes(),
            searchRouter.allowedMethods(),
        );
        const dataRouter = this.getDataRouter();
        apiRouter.use(
            '/data',
            dataRouter.routes(),
            dataRouter.allowedMethods(),
        );
        const userRouter = this.getUserRouter();
        apiRouter.use(
            '/user',
            userRouter.routes(),
            userRouter.allowedMethods(),
        );
        const utilRouter = this.getUtilRouter();
        apiRouter.use(
            '/util',
            utilRouter.routes(),
            utilRouter.allowedMethods(),
        );

        apiRouter.all('/', (ctx) => {
            ctx.body = 'hello from api';
        });

        router.get('/health', routes.health.Route.get());

        router.use('/api/v3', apiRouter.routes(), apiRouter.allowedMethods());

        // Catch all route to trigger middleware
        router.all('/api*', (ctx, next) => next());
        this.router = router;
    }

    getDataRouter() {
        const { middleware, routes } = this;
        this.logger.verbose('Creating Data Router...');
        const router = new Router();
        this.logger.verbose('    Loading middleware...');
        router.use(middleware.Db.get());
        router.use(middleware.Resolve.get());
        router.use(middleware.Access.get());
        const matchIdentifier = middleware.MatchIdentifier.get();
        const resolveVirtual = middleware.ResolveVirtual.get();
        this.logger.verbose('    Done. Creating routes...');
        const dataRoutes = routes.api.v3.data;

        router.post(
            '/matrix',
            matchIdentifier,
            dataRoutes.matrix.Route.get(),
        );
        router.post(
            '/pheno',
            matchIdentifier,
            dataRoutes.pheno.Route.get(),
        );
        router.post(
            '/dna',
            dataRoutes.dna.Route.get(),
        );
        router.post(
            '/ncbi',
            dataRoutes.ncbi.Route.get(),
        );
        router.post(
            '/plot',
            dataRoutes.plot.Route.get(),
        );
        router.post(
            '/annotation',
            matchIdentifier,
            dataRoutes.annotation.Route.get(),
        );
        router.post(
            '/interaction',
            resolveVirtual,
            matchIdentifier,
            dataRoutes.interaction.Route.get(),
        );
        router.post(
            '/mhn_graph',
            dataRoutes.mhn_graph.Route.get(),
        );
        router.post(
            '/dataset',
            dataRoutes.dataset.Route.get(),
        );
        router.all('*', (ctx) => {
            ctx.body = 'unknown data route';
        });

        this.logger.verbose('Done.');
        return router;
    }

    getAdminRouter() {
        const { middleware, routes } = this;
        this.logger.verbose('Creating Admin Router...');
        const router = new Router();
        this.logger.verbose('    Loading middleware...');
        router.use(middleware.RequireRoot.get());
        this.logger.verbose('    Done. Creating routes...');
        const adminRoutes = routes.api.v3.admin;

        router.post(
            '/insert',
            adminRoutes.insert.Route.get(),
        );
        this.logger.verbose('Done.');
        return router;
    }

    getSearchRouter() {
        const { middleware, routes } = this;
        this.logger.verbose('Creating Search Router...');
        const router = new Router();
        this.logger.verbose('    Loading middleware...');
        router.use(middleware.Db.get());
        router.use(middleware.Resolve.get());
        this.logger.verbose('    Done. Creating routes...');
        const searchRoutes = routes.api.v3.search;

        router.post('/query', searchRoutes.query.Route.get());
        router.post('/id', searchRoutes.id.Route.get());
        router.post('/token', searchRoutes.token.Route.get());


        this.logger.verbose('Done.');
        return router;
    }

    getUserRouter() {
        const { routes } = this;
        this.logger.verbose('Creating User Router...');
        const router = new Router();
        this.logger.verbose('    Loading middleware...');
        this.logger.verbose('    Done. Creating routes...');
        const userRoutes = routes.api.v3.user;

        router.get('/login/:client', userRoutes.login.Route.get());
        router.get('/callback/:client', userRoutes.callback.Route.get());
        router.get('/logout/:client', userRoutes.logout.Route.get());
        router.post('/info', userRoutes.info.Route.get());

        this.logger.verbose('Done.');
        return router;
    }

    getUtilRouter() {
        const { middleware, routes } = this;
        this.logger.verbose('Creating Util Router...');
        const router = new Router();
        this.logger.verbose('    Loading middleware...');
        router.use(middleware.Db.get());
        router.use(middleware.Resolve.get());
        this.logger.verbose('    Done. Creating routes...');
        const utilRoutes = routes.api.v3.util;

        router.post('/idconvert', utilRoutes.idconvert.Route.get());

        this.logger.verbose('Done.');
        return router;
    }


    get() {
        return this.router;
    }
}

module.exports = ApiRouter;
