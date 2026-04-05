import { Pool } from "pg";

export const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "tradezen",
  password: "pass",
  port: 5432,
});
