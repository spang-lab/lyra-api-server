const LyraComponent = require('lyra-component');

class Access extends LyraComponent {
    static requires() {
        return {
            converter: 'database.Converter',
            constants: 'util.Constants',
        };
    }


    getUserAccess(ctx) {
        const { user } = ctx.session;
        if (!user) {
            return 'public';
        }
        const { groups } = user;
        if (groups.includes('lyra')) {
            return 'private';
        }
        return 'internal';
    }


    isAllowed(userAccess, datasetAccess) {
        if (this.config.ignoreAccess) {
            return true;
        }
        const accessLevels = this.constants.get('ACCESS_VALUE');
        const userLevel = accessLevels[userAccess] || 0;
        const datasetLevel = accessLevels[datasetAccess] || 0;
        return userLevel >= datasetLevel;
    }


    get() {
        return async (ctx, next) => {
            const { dataset } = ctx.state;
            if (!dataset) {
                await next();
                return;
            }
            const datasetAccess = this.converter.access(
                dataset.access,
                true,
            );
            const userAccess = this.getUserAccess(ctx);
            if (!this.isAllowed(userAccess, datasetAccess)) {
                throw new Error(`
                    Access Error:
                    Access denied to dataset ${dataset.name}
                `);
            }
            await next();
        };
    }
}
module.exports = Access;
