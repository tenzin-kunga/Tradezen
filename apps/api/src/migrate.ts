import { runMigrations, pool } from "./db";

async function main() {
  try {
    await runMigrations();
    console.log("[migrate] All migrations complete.");
  } catch (err) {
    console.error("[migrate] Migration failed:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
