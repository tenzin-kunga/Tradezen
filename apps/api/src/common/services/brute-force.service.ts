import { Injectable, Logger } from '@nestjs/common';
import { pool } from '../../db';

@Injectable()
export class BruteForceService {
  private readonly logger = new Logger('BruteForce');
  private readonly MAX_ATTEMPTS = 5;

  async recordFailedAttempt(identifier: string, ip: string): Promise<void> {
    try {
      await pool.query(
        'INSERT INTO login_attempts (identifier, ip, created_at) VALUES ($1, $2, NOW())',
        [identifier, ip],
      );
    } catch (error) {
      this.logger.error(`Failed to record login attempt: ${(error as Error).message}`);
    }
  }

  async isLockedOut(identifier: string): Promise<boolean> {
    try {
      const result = await pool.query(
        `SELECT COUNT(*) as attempts FROM login_attempts
         WHERE identifier = $1 AND created_at > NOW() - INTERVAL '15 minutes'`,
        [identifier],
      );
      return parseInt(result.rows[0].attempts) >= this.MAX_ATTEMPTS;
    } catch {
      return false;
    }
  }

  async clearAttempts(identifier: string): Promise<void> {
    try {
      await pool.query('DELETE FROM login_attempts WHERE identifier = $1', [identifier]);
    } catch {
      // Non-fatal
    }
  }
}
