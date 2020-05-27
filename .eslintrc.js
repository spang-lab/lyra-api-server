module.exports = {
    extends: 'airbnb',
    rules: {
        indent: ['error', 4],
        'import/extensions': ['error', 'ignorePackages'],
        'class-methods-use-this': 'off',
    },
    settings: {
        'import/resolver': 'node',
    }

};

