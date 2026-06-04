import { getDb, getClient, type TradezenDb } from '@tradezen/db';

export const db: TradezenDb = getDb();
export const client = getClient();
