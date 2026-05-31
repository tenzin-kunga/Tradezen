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

      const isRetryable = (err: unknown): boolean => {
        if (!(err instanceof Error)) return false;
        const pgErr = err as { code?: string };
        if (pgErr.code === '40P01') return true;
        if (pgErr.code === '40001') return true;
        if (pgErr.code?.startsWith('08')) return true;
        return (
          err.message.includes('deadlock') ||
          err.message.includes('serializable') ||
          err.message.includes('connection')
        );
      };

      if (!isRetryable(error) || attempt === maxRetries) {
        logger.error(
          `Transaction failed (attempt ${attempt + 1}/${maxRetries + 1}): ${lastError.message}`,
        );
        throw lastError;
      }

      logger.warn(
        `Retrying transaction (attempt ${attempt + 1}/${maxRetries + 1})`,
      );
      await new Promise((resolve) =>
        setTimeout(resolve, 1000 * Math.pow(2, attempt)),
      );
    } finally {
      client.release();
    }
  }

  // Unreachable — loop always throws or returns
  throw lastError!;
}
