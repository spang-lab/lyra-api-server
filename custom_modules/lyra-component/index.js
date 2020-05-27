
class LyraComponent {
    static requires() {
        return {};
    }

    constructor(dependencies) {
        Object.keys(dependencies).forEach((key) => {
            this[key] = dependencies[key];
        });
    }
}
module.exports = LyraComponent;
