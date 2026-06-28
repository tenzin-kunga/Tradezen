import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import * as relations from "./relations";

const fullSchema = { ...schema, ...relations };
export type TradezenDb = PostgresJsDatabase<typeof fullSchema>;

let _db: TradezenDb | null = null;
let _client: ReturnType<typeof postgres> | null = null;

export function getDb(): TradezenDb {
  if (!_db) {
    _client = postgres(
      process.env.DATABASE_URL ??
        `postgresql://${process.env.DB_USER ?? "postgres"}:${process.env.DB_PASSWORD ?? "postgres"}@${process.env.DB_HOST ?? "localhost"}:${process.env.DB_PORT ?? 5432}/${process.env.DB_NAME ?? "tradezen"}?sslmode=disable`,
    );
    _db = drizzle(_client, { schema: fullSchema });
  }
  return _db;
}

export function getClient() {
  if (!_client) {
    _client = postgres(
      process.env.DATABASE_URL ??
        `postgresql://${process.env.DB_USER ?? "postgres"}:${process.env.DB_PASSWORD ?? "postgres"}@${process.env.DB_HOST ?? "localhost"}:${process.env.DB_PORT ?? 5432}/${process.env.DB_NAME ?? "tradezen"}?sslmode=disable`,
    );
  }
  return _client;
}
