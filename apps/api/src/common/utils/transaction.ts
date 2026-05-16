import { pool } from '../../db';
import { Logger } from '@nestjs/common';
import type { PoolClient } from 'pg';

const logger = new Logger('TransactionManager');

export type TransactionClient = PoolClient;

export async function withTransaction<T>(
  fn: (client: TransactionClient) => Promise<T>,
  maxRetries = 2,
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      lastError = error as Error;
      try {
        await client.query('ROLLBACK');
      } catch {
        // Ignore rollback errors
      }

      const isRetryable =
        error instanceof Error &&
        (error.message.includes('deadlock') ||
          error.message.includes('serializable') ||
          error.message.includes('connection'));

      if (!isRetryable || attempt === maxRetries) {
        logger.error(
          `Transaction failed (attempt ${attempt + 1}/${maxRetries + 1}): ${lastError.message}`,
        );
        throw lastError;
      }

      logger.warn(
        `Retrying transaction (attempt ${attempt + 1}/${maxRetries + 1})`,
      );
      await new Promise((resolve) =>
        setTimeout(resolve, 100 * Math.pow(2, attempt)),
      );
    } finally {
      client.release();
    }
  }

  throw new Error('Transaction failed after all retries');
}
