import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

let _db: ReturnType<typeof drizzle> | null = null;
let _client: ReturnType<typeof postgres> | null = null;

export function getDb() {
  if (!_db) {
    _client = postgres(process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/tradezen');
    _db = drizzle(_client, { schema });
  }
  return _db;
}

export function getClient() {
  if (!_client) {
    _client = postgres(process.env.DATABASE_URL ?? 'postgresql://postgres:postgres@localhost:5432/tradezen');
  }
  return _client;
}
