const { Pool } = require('pg');
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'tradezen',
  password: process.env.DB_PASSWORD || 'pass',
  port: Number(process.env.DB_PORT || 5432),
});
pool
  .query('SELECT COUNT(*) AS cnt FROM trades')
  .then((res) => {
    console.log(JSON.stringify(res.rows[0]));
    return pool.end();
  })
  .catch((err) => {
    console.error(err.message);
    pool.end();
    process.exit(1);
  });
