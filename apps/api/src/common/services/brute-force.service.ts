import { Injectable, Logger } from '@nestjs/common';
import { eq, sql, count, lt, gte } from 'drizzle-orm';
import { db } from '../../db/drizzle';
import { loginAttempts } from '../../db/schema';

@Injectable()
export class BruteForceService {
  private readonly logger = new Logger('BruteForce');
  private readonly MAX_ATTEMPTS = 5;
  private unavailable = false;

  async recordFailedAttempt(identifier: string, ip: string): Promise<void> {
    if (this.unavailable) return;
    try {
      await db.insert(loginAttempts).values({
        identifier,
        ip,
        createdAt: sql`NOW()`,
      });
    } catch (error) {
      this.unavailable = true;
      this.logger.warn(
        'Brute-force tracking unavailable — login_attempts table may not exist',
      );
    }
  }

  async isLockedOut(identifier: string): Promise<boolean> {
    if (this.unavailable) return false;
    try {
      const result = await db
        .select({ attempts: count() })
        .from(loginAttempts)
        .where(
          sql`${loginAttempts.identifier} = ${identifier} AND ${loginAttempts.createdAt} > NOW() - INTERVAL '15 minutes'`,
        );
      return result[0].attempts >= this.MAX_ATTEMPTS;
    } catch {
      this.unavailable = true;
      this.logger.warn(
        'Brute-force tracking unavailable — login_attempts table may not exist',
      );
      return false;
    }
  }

  async clearAttempts(identifier: string): Promise<void> {
    if (this.unavailable) return;
    try {
      await db
        .delete(loginAttempts)
        .where(eq(loginAttempts.identifier, identifier));
    } catch {
      // Non-fatal
    }
  }
}
