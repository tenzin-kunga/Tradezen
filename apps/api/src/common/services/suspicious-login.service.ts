import { Injectable, Logger } from '@nestjs/common';
import { eq, sql, count } from 'drizzle-orm';
import { db } from '../../db/drizzle';
import { loginAttempts, users } from '@tradezen/db';

@Injectable()
export class SuspiciousLoginService {
  private readonly logger = new Logger('SuspiciousLogin');

  async detectAnomalies(userId: string, ip: string): Promise<string[]> {
    const flags: string[] = [];

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { email: true },
    });

    if (!user) {
      return flags;
    }

    try {
      const knownIps = await db
        .select({ ip: loginAttempts.ip })
        .from(loginAttempts)
        .where(
          sql`${loginAttempts.identifier} = ${user.email} AND ${loginAttempts.createdAt} > NOW() - INTERVAL '30 days'`,
        );

      const uniqueIps = [...new Set(knownIps.map((row) => row.ip))];
      const isKnownIp = uniqueIps.includes(ip);
      if (!isKnownIp && uniqueIps.length > 0) {
        flags.push('NEW_IP');
        this.logger.warn(
          `Suspicious login: userId=${userId} ip=${ip} flag=NEW_IP`,
        );
      }
    } catch (error) {
      this.logger.error(`IP check failed: ${(error as Error).message}`);
    }

    try {
      const result = await db
        .select({ count: count() })
        .from(loginAttempts)
        .where(
          sql`${loginAttempts.identifier} = ${user.email} AND ${loginAttempts.createdAt} > NOW() - INTERVAL '5 minutes'`,
        );

      if (result[0].count > 3) {
        flags.push('POSSIBLE_BRUTE_FORCE');
        this.logger.warn(
          `Suspicious login: userId=${userId} ip=${ip} flag=POSSIBLE_BRUTE_FORCE`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Rapid login check failed: ${(error as Error).message}`,
      );
    }

    return flags;
  }
}
