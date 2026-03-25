const { Pool } = require("pg");
const pool = new Pool({
    user: "postgres",
    host: "localhost",
    database: "africa_proptech",
    password: "Mojirade27!",
    port: 5432,
});

pool.connect()
.then(() => console.log("PostgreSQL connected"))
.catch(err => console.error("Database connection error:", err));

module.exports = pool;