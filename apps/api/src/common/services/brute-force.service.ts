import { Injectable, Logger } from '@nestjs/common';
import { pool } from '../../db';

@Injectable()
export class BruteForceService {
  private readonly logger = new Logger('BruteForce');
  private readonly MAX_ATTEMPTS = 5;
  private unavailable = false;

  async recordFailedAttempt(identifier: string, ip: string): Promise<void> {
    if (this.unavailable) return;
    try {
      await pool.query(
        'INSERT INTO login_attempts (identifier, ip, created_at) VALUES ($1, $2, NOW())',
        [identifier, ip],
      );
    } catch (error) {
      this.unavailable = true;
      this.logger.warn('Brute-force tracking unavailable — login_attempts table may not exist');
    }
  }

  async isLockedOut(identifier: string): Promise<boolean> {
    if (this.unavailable) return false;
    try {
      const result = await pool.query(
        `SELECT COUNT(*) as attempts FROM login_attempts
         WHERE identifier = $1 AND created_at > NOW() - INTERVAL '15 minutes'`,
        [identifier],
      );
      return parseInt(result.rows[0].attempts) >= this.MAX_ATTEMPTS;
    } catch {
      this.unavailable = true;
      this.logger.warn('Brute-force tracking unavailable — login_attempts table may not exist');
      return false;
    }
  }

  async clearAttempts(identifier: string): Promise<void> {
    if (this.unavailable) return;
    try {
      await pool.query('DELETE FROM login_attempts WHERE identifier = $1', [identifier]);
    } catch {
      // Non-fatal
    }
  }
}
