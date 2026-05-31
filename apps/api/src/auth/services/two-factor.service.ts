import { Injectable, Logger } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { db } from '../../db/drizzle';
import { users } from '@tradezen/db';
import { generateSecret, verify } from 'otplib';
import { generateTOTP } from '@otplib/uri';
import * as crypto from 'crypto';

@Injectable()
export class TwoFactorService {
  private readonly logger = new Logger('TwoFactor');

  async generateSecret(
    userId: number,
  ): Promise<{ secret: string; otpauthUrl: string }> {
    const secret = generateSecret();
    const user = await db.query.users.findFirst({
      where: eq(users.id, String(userId)),
      columns: { email: true },
    });
    const email = user?.email ?? 'user@tradezen.app';
    const otpauthUrl = generateTOTP({
      issuer: 'TradeZen',
      label: email,
      secret,
    });

    await db
      .update(users)
      .set({ twoFactorSecret: secret })
      .where(eq(users.id, String(userId)));
    return { secret, otpauthUrl };
  }

  async verifyToken(userId: number, token: string): Promise<boolean> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, String(userId)),
      columns: { twoFactorSecret: true },
    });
    if (!user?.twoFactorSecret) return false;

    const result = await verify({ token, secret: user.twoFactorSecret });
    return result.valid === true;
  }

  async generateBackupCodes(userId: number): Promise<string[]> {
    const codes = Array.from({ length: 8 }, () =>
      crypto.randomBytes(4).toString('hex'),
    );
    await db
      .update(users)
      .set({ twoFactorBackupCodes: codes })
      .where(eq(users.id, String(userId)));
    return codes;
  }

  async enableTwoFactor(userId: number): Promise<void> {
    await db
      .update(users)
      .set({ twoFactorEnabled: true })
      .where(eq(users.id, String(userId)));
  }

  async disableTwoFactor(userId: number): Promise<void> {
    await db
      .update(users)
      .set({
        twoFactorEnabled: false,
        twoFactorSecret: null,
        twoFactorBackupCodes: null,
      })
      .where(eq(users.id, String(userId)));
  }

  async verifyBackupCode(userId: number, code: string): Promise<boolean> {
    const user = await db.query.users.findFirst({
      where: eq(users.id, String(userId)),
      columns: { twoFactorBackupCodes: true },
    });
    const codes: string[] = Array.isArray(user?.twoFactorBackupCodes)
      ? user.twoFactorBackupCodes
      : [];
    const index = codes.indexOf(code);
    if (index === -1) return false;

    codes.splice(index, 1);
    await db
      .update(users)
      .set({ twoFactorBackupCodes: codes })
      .where(eq(users.id, String(userId)));
    return true;
  }
}
