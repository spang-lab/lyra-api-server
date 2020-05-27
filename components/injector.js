/* eslint-disable global-require, import/no-dynamic-require,
   class-methods-use-this, no-console, no-param-reassign */

const fsPromise = require('fs').promises;
const path = require('path');

const COLOR_RED = '\x1b[31m';
const COLOR_CYAN = '\x1b[36m';
const COLOR_RESET = '\x1b[0m';

class Injector {
    constructor() {
        this.logLevel = 'normal';
        if (process.env.NODE_ENV === 'production') {
            this.logLevel = 'quiet';
        }
        if (process.env.DEBUG) {
            this.logLevel = 'verbose';
        }
    }

    log(...args) {
        if (this.logLevel === 'quiet') return;
        console.log(...args);
    }

    logVerbose(...args) {
        if (this.logLevel !== 'verbose') return;
        console.log(...args);
    }

    setLogLevel(level) {
        this.logLevel = level;
    }

    async getFiles(root) {
        const contents = await fsPromise.readdir(root);
        const paths = contents.map((name) => ({
            name,
            path: path.resolve(root, name),
        }));
        const statPromises = paths.map(async (fsNode) => ({
            ...fsNode,
            stats: await fsPromise.stat(fsNode.path),
        }));
        const nodes = await Promise.all(statPromises);
        const directories = nodes.filter((node) => node.stats.isDirectory());
        const codeFiles = nodes.filter((node) => !node.stats.isDirectory() && path.extname(node.name) === '.js');
        const codePaths = codeFiles.map((file) => file.path);
        const childPromises = directories.map(async (dir) => this.getFiles(dir.path));
        const childPaths = await Promise.all(childPromises);
        return codePaths.concat(...childPaths);
    }

    loadFile(file) {
        try {
            return require(file);
        } catch (e) {
            console.log(`Error loading file ${file}:${e.toString()}`);
            return null;
        }
    }


    resolveBlueprint(seed, blueprint) {
        const relPath = path.relative(seed.componentPath, blueprint.path);
        const dirName = path.dirname(relPath);
        const tags = dirName.split(path.sep).filter((tag) => tag !== '.');
        const { name } = blueprint.Constructor;
        tags.push(name);
        const fullName = tags.join('.');
        const dependencies = blueprint.Constructor.requires();
        return {
            ...blueprint,
            fullName,
            tags,
            dependencies,
        };
    }

    addDefaults(blueprints) {
        const defaults = {};
        blueprints
            .filter((b) => b.tags.includes('default'))
            .forEach((b) => {
                const name = b.tags[b.tags.length - 1]
                    .replace(/^([A-Z])/, (m, p1) => p1.toLowerCase());
                defaults[name] = b.fullName;
            });
        return blueprints.map((blueprint) => {
            if (blueprint.tags.includes('default')) {
                return blueprint;
            }
            blueprint.dependencies = {
                ...blueprint.dependencies,
                ...defaults,
            };
            return blueprint;
        });
    }


    getModules(regex, indentation) {
        const modules = {};
        const { components } = this;
        Object.keys(components).forEach((name) => {
            if (regex.test(name)) {
                this.build(name, indentation);
                const component = components[name];
                const tags = component.tags.slice(0);
                const cName = tags.pop();
                let ref = modules;
                tags.forEach((tag) => {
                    if (!ref[tag]) {
                        ref[tag] = {};
                    }
                    ref = ref[tag];
                });
                ref[cName] = component.module;
            }
        });
        let parent = modules;
        while (Object.keys(parent).length === 1) {
            [parent] = Object.values(parent);
        }
        return parent;
    }


    resolveDependencies(blueprint, indentation) {
        const { components } = this;
        const dependencies = {};
        Object.keys(blueprint.dependencies).forEach((key) => {
            const name = blueprint.dependencies[key];
            if (name instanceof RegExp) {
                const tree = this.getModules(name, indentation + 1);
                dependencies[key] = tree;
                return;
            }
            this.build(name, indentation + 1);
            dependencies[key] = components[name].module;
        });
        return dependencies;
    }

    build(name, indentation = 0) {
        const { components } = this;
        const blueprint = components[name];
        const spacing = `        ${new Array(indentation + 1).join(' |')}`;
        if (!name.includes('default')) {
            this.log(
                spacing,
                `+ Getting Module ${COLOR_CYAN}${name}${COLOR_RESET}...`,
            );
        }
        if (!blueprint) {
            console.log(`
            ${COLOR_RED} Composition Error: Unknown component ${name}
            ${COLOR_RED} Bootstrap failed. Exiting...`);
            process.exit(1);
        }
        if (blueprint.module) {
            this.logVerbose(spacing, '+- Done.');
            this.logVerbose(spacing);
            return;
        }
        this.logVerbose(spacing, `| Building Module${COLOR_CYAN} ${name}`, COLOR_RESET);
        const injection = this.resolveDependencies(blueprint, indentation);
        blueprint.module = new blueprint.Constructor(injection);
        if (blueprint.module.getInjectPayload) {
            try {
                blueprint.module = blueprint.module.getInjectPayload();
            } catch (e) {
                console.error(e);
                process.exit(1);
            }
        }
        this.logVerbose(spacing, '+- Done.');
        this.logVerbose(spacing);
    }

    async inject(seed) {
        console.log(COLOR_CYAN, 'initial system bootstrap...', COLOR_RESET);
        const files = await this.getFiles(seed.componentPath);
        let blueprints = files.map((f) => ({
            path: f,
            Constructor: this.loadFile(f),
        }));
        blueprints = blueprints.filter((blueprint) => blueprint.Constructor && blueprint.Constructor.requires);
        this.log(COLOR_CYAN, `    ${blueprints.length} Modules detected`, COLOR_RESET);
        this.log(COLOR_CYAN, '    Building dependency tree...', COLOR_RESET);
        blueprints = blueprints.map((b) => this.resolveBlueprint(seed, b));
        blueprints = this.addDefaults(blueprints);
        const components = {
            Seed: {
                fullName: 'Seed',
                path: '',
                module: seed,
            },
        };
        blueprints.forEach((blueprint) => {
            components[blueprint.fullName] = blueprint;
        });
        this.components = components;
        this.log(COLOR_CYAN, '    Resolving dependencies...', COLOR_RESET);
        Object.keys(components).forEach((name) => this.build(name, 0));
        this.log(COLOR_CYAN, '    Modules ready for initialization.', COLOR_RESET);
        this.log(COLOR_CYAN, '    Switching to logging module.', COLOR_RESET);
        console.log(COLOR_CYAN, 'Bootstrap complete.\n', COLOR_RESET);
    }

    get(name) {
        const component = this.components[name];
        if (!component || !component.module) {
            throw new Error(`Unknown Component ${name} could not be loaded`);
        }
        return component.module;
    }

    async init() {
        const logger = this.get('default.Logger');
        logger.important('starting initialization process...');
        logger.important('util initialization...');
        const utilInit = this.get('util.Initialization');
        await utilInit.init();
        logger.important('database initialization...');
        const databaseInit = this.get('database.Initialization');
        await databaseInit.init();
        logger.important('database initialization complete.');
        logger.important('router initialization...');
        const routerInit = this.get('router.Initialization');
        await routerInit.init();
        logger.important('router initialization complete.');
    }
}

module.exports = Injector;
