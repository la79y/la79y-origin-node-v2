const { query } = require('./dbClient');

const fetchConfigByKey = async (key) => {
    try {
        const res = await query(`select * from la79y.public."GlobalConfigs" where key='${key}'`, []);
        console.log(res.rows);
        return res.rows
    } catch (err) {
        console.error('Error executing query', err.stack);
        throw err
    }
};

module.exports = { fetchConfigByKey }; // Export the function for use in other files