const LyraComponent = require('lyra-component');
/**
 * Database utility function for versioning and updates
 * @memberof module:Database
 * @class
 * @param {Module} connection - the database connection
 * @param {Module} logger - the logger
 * @param {Module} config - the configuration
 */
class Version extends LyraComponent {
    static requires() {
        return {
        };
    }

    /**
     * set the version of the database
     * @param {string} version - the version to set
     */
    async setVersion(db, version) {
        const query =
            `CREATE OR REPLACE FUNCTION dbversion()
                RETURNS text as 
                $v$
                    DECLARE
                        result text;
                    BEGIN
                        RETURN $(version);
                    END;
                $v$
                LANGUAGE plpgsql;
            `;
        await db.none(query, {
            version,
        });
    }

    /**
     * get the version of the database by calling its version function
     */
    async getVersion(db) {
        const query = 'SELECT dbversion()';
        const res = await db.one(query);
        return res.dbversion;
    }
    /**
     * Check if the version function exists in the database
     */
    async versionExists(db) {
        const query =
            `SELECT EXISTS (
                SELECT routine_name FROM information_schema.routines 
                WHERE routine_type='FUNCTION' 
                AND routine_name LIKE 'dbversion%'
            );`;
        const res = await db.one(query);
        return res.exists;
    }
}
module.exports = Version;

