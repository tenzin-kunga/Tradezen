import { Pool } from "pg";
import * as fs from "fs";
import * as path from "path";

export const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    })
  : new Pool({
      user: process.env.DB_USER ?? "postgres",
      host: process.env.DB_HOST ?? "localhost",
      database: process.env.DB_NAME ?? "tradezen",
      password: process.env.DB_PASSWORD ?? "pass",
      port: Number(process.env.DB_PORT ?? 5432),
    });

export async function runMigrations() {
  // Create the tracking table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename TEXT NOT NULL UNIQUE,
      executed_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // Read migration files
  const migrationsDir = path.join(__dirname, "..", "migrations");
  if (!fs.existsSync(migrationsDir)) {
    console.log("[migrations] No migrations directory found, skipping.");
    return;
  }

  const files = fs.readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  // Get already-executed migrations
  const executed = await pool.query("SELECT filename FROM schema_migrations");
  const executedSet = new Set(executed.rows.map((r: { filename: string }) => r.filename));

  for (const file of files) {
    if (executedSet.has(file)) continue;

    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [file]);
      await client.query("COMMIT");
      console.log(`[migrations] ✓ ${file}`);
    } catch (err) {
      await client.query("ROLLBACK");
      console.error(`[migrations] ✗ ${file}:`, err);
      throw err;
    } finally {
      client.release();
    }
  }
}
