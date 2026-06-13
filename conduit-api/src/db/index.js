const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
// console.log("DATABASE_URL:", process.env.DATABASE_URL);

// A small wrapper so we call pool.query() from one place
const query = (text, params) => pool.query(text, params);

module.exports = { query, pool };
