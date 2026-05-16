import { Injectable, Logger } from '@nestjs/common';
import { pool } from '../../db';

@Injectable()
export class SuspiciousLoginService {
  private readonly logger = new Logger('SuspiciousLogin');

  async detectAnomalies(userId: number, ip: string): Promise<string[]> {
    const flags: string[] = [];

    try {
      const knownIps = await pool.query(
        `SELECT DISTINCT ip FROM login_attempts
         WHERE identifier = (SELECT email FROM users WHERE id = $1)
         AND created_at > NOW() - INTERVAL '30 days'`,
        [userId],
      );

      const isKnownIp = knownIps.rows.some((row) => row.ip === ip);
      if (!isKnownIp && knownIps.rows.length > 0) {
        flags.push('NEW_IP');
        this.logger.warn(`Suspicious login: userId=${userId} ip=${ip} flag=NEW_IP`);
      }
    } catch (error) {
      this.logger.error(`IP check failed: ${(error as Error).message}`);
    }

    try {
      const recentFailedAttempts = await pool.query(
        `SELECT COUNT(*) as count FROM login_attempts
         WHERE identifier = (SELECT email FROM users WHERE id = $1)
         AND created_at > NOW() - INTERVAL '5 minutes'`,
        [userId],
      );

      if (parseInt(recentFailedAttempts.rows[0].count) > 3) {
        flags.push('POSSIBLE_BRUTE_FORCE');
        this.logger.warn(`Suspicious login: userId=${userId} ip=${ip} flag=POSSIBLE_BRUTE_FORCE`);
      }
    } catch (error) {
      this.logger.error(`Rapid login check failed: ${(error as Error).message}`);
    }

    return flags;
  }
}
