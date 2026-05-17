import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import * as relations from './relations';

const client = postgres(
  process.env.DATABASE_URL ??
    'postgresql://postgres:postgres@localhost:5432/tradezen',
);
export const db = drizzle(client, { schema, ...relations });
export { client };
