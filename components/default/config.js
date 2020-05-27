/* eslint-disable import/no-unresolved */
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');

const LyraComponent = require('lyra-component');

class Config extends LyraComponent {
    static requires() {
        return {
            seed: 'Seed',
            customError: 'default.CustomError',
        };
    }

    getInjectPayload() {
        return this.create();
    }

    create() {
        const envMapping = {
            postgresUser: 'POSTGRES_USER',
            postgresPassword: 'POSTGRES_PASSWORD',
            ncbiApiKey: 'NCBI_API_KEY',
            oidcClientSecret: 'OIDC_CLIENT_SECRET',
            cookieSecret: 'COOKIE_SECRET',
            rootPassword: 'ROOT_PASSWORD',
        };
        const configPath = path.join(this.seed.rootPath, '/config/config.yaml');
        const staticPath = path.join(this.seed.rootPath, '/config/static.yaml');
        const configYml = fs.readFileSync(configPath);
        const staticYml = fs.readFileSync(staticPath);
        const configValues = yaml.safeLoad(configYml);
        const staticValues = yaml.safeLoad(staticYml);

        const debug = process.env.DEBUG || configValues.server.debug;

        const dynamicValues = {
            rootPath: this.seed.rootPath,
            nodeEnv: process.env.NODE_ENV || 'production',
            ignoreAccess: process.env.IGNORE_ACCESS || false,
            debug: debug || false,
        };
        const secrets = {};
        Object.keys(envMapping).forEach((key) => {
            const envName = envMapping[key];
            const value = process.env[envName];
            if (!value) {
                throw this.customError(
                    'IncompleteConfigError',
                    `${key} is missing, configure it with
                     with enviroment variable ${envMapping[key]}`,
                );
            }
            secrets[key] = value;
        });
        this.config = {
            ...configValues,
            ...dynamicValues,
            static: staticValues,
            secrets,
        };
        return this.config;
    }
}
module.exports = Config;
