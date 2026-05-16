import { Injectable, Logger } from '@nestjs/common';
import { pool } from '../../db';

@Injectable()
export class SuspiciousLoginService {
  private readonly logger = new Logger('SuspiciousLogin');

  async detectAnomalies(userId: number, ip: string): Promise<string[]> {
    const flags: string[] = [];

    // Check for login from new IP
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
        this.logger.warn({
          event: 'suspicious_login',
          userId,
          ip,
          flag: 'NEW_IP',
        });
      }
    } catch (error) {
      this.logger.error(`IP check failed: ${(error as Error).message}`);
    }

    // Check for rapid successive logins
    try {
      const recentLogins = await pool.query(
        `SELECT COUNT(*) as count FROM login_attempts
         WHERE identifier = (SELECT email FROM users WHERE id = $1)
         AND created_at > NOW() - INTERVAL '5 minutes'`,
        [userId],
      );

      if (parseInt(recentLogins.rows[0].count) > 3) {
        flags.push('RAPID_LOGIN');
        this.logger.warn({
          event: 'suspicious_login',
          userId,
          ip,
          flag: 'RAPID_LOGIN',
        });
      }
    } catch (error) {
      this.logger.error(`Rapid login check failed: ${(error as Error).message}`);
    }

    return flags;
  }
}
