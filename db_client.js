const { Client } = require('pg');

const client = new Client({
    user: 'admin',
    host: 'localhost',
    database: 'la79y',
    password: '1234',
    port: 5432,
});

// client.connect();

async function getConfig(client, key){
    client.query(`select * from la79y.public."GlobalConfigs" where key='${key}'`, (err, res) => {
        if (err) {
            console.error(err);
            throw (err)
            // return;
        }
        // for (let row of res.rows) {
        //     console.log(row);
        //     // return row
        // }
        console.log(res.rows)
        return res.rows;

        // Don't forget to close the client connection once you're done
        // client.end();
    });
}

module.exports ={
    dbClient: client,
    getConfig: getConfig
}
