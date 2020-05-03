const log = require("./logservice");
const mysql = require("mysql");

const mysqlConnection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

mysqlConnection.connect((err) => {
    if(err) throw err;
    log("Connected to DB schema nodekafka !!!");
});

function destroyMySQLConnection() {
    mysqlConnection.destroy();
}

module.exports = {
    destroyMySQLConnection: destroyMySQLConnection,
    mysqlConnection: mysqlConnection
};