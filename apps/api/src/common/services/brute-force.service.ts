import { Injectable, Logger } from '@nestjs/common';
import { eq, sql, count } from 'drizzle-orm';
import { db } from '../../db/drizzle';
import { loginAttempts } from '@tradezen/db';

@Injectable()
export class BruteForceService {
  private readonly logger = new Logger('BruteForce');
  private readonly MAX_ATTEMPTS = 5;

  private async checkTableExists(): Promise<boolean> {
    try {
      await db.select({ count: count() }).from(loginAttempts).limit(1);
      return true;
    } catch {
      return false;
    }
  }

  async recordFailedAttempt(identifier: string, ip: string): Promise<void> {
    const tableExists = await this.checkTableExists();
    if (!tableExists) {
      this.logger.warn(
        'Brute-force tracking unavailable — login_attempts table may not exist',
      );
      return;
    }
    try {
      await db.insert(loginAttempts).values({
        identifier,
        ip,
        createdAt: sql`NOW()`,
      });
    } catch (error) {
      this.logger.error(
        `Failed to record login attempt: ${(error as Error).message}`,
      );
    }
  }

  async isLockedOut(identifier: string): Promise<boolean> {
    const tableExists = await this.checkTableExists();
    if (!tableExists) {
      this.logger.warn(
        'Brute-force tracking unavailable — login_attempts table may not exist',
      );
      return false;
    }
    try {
      const result = await db
        .select({ attempts: count() })
        .from(loginAttempts)
        .where(
          sql`${loginAttempts.identifier} = ${identifier} AND ${loginAttempts.createdAt} > NOW() - INTERVAL '15 minutes'`,
        );
      return result[0].attempts >= this.MAX_ATTEMPTS;
    } catch (error) {
      this.logger.error(
        `Failed to check lockout status: ${(error as Error).message}`,
      );
      return false;
    }
  }

  async clearAttempts(identifier: string): Promise<void> {
    const tableExists = await this.checkTableExists();
    if (!tableExists) {
      this.logger.warn(
        'Brute-force tracking unavailable — login_attempts table may not exist',
      );
      return;
    }
    try {
      await db
        .delete(loginAttempts)
        .where(eq(loginAttempts.identifier, identifier));
    } catch (error) {
      this.logger.error(
        `Failed to clear login attempts: ${(error as Error).message}`,
      );
    }
  }
}
