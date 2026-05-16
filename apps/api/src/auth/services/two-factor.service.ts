import { Injectable, Logger } from '@nestjs/common';
import { pool } from '../../db';
import { generateSecret, generate, verify } from 'otplib';
import { generateTOTP } from '@otplib/uri';
import * as crypto from 'crypto';

@Injectable()
export class TwoFactorService {
  private readonly logger = new Logger('TwoFactor');

  async generateSecret(userId: number): Promise<{ secret: string; otpauthUrl: string }> {
    const secret = generateSecret();
    const user = await pool.query('SELECT email FROM users WHERE id = $1', [userId]);
    const email = user.rows[0]?.email ?? 'user@tradezen.app';
    const otpauthUrl = generateTOTP({ issuer: 'TradeZen', label: email, secret });

    await pool.query(
      'UPDATE users SET two_factor_secret = $1 WHERE id = $2',
      [secret, userId],
    );
    return { secret, otpauthUrl };
  }

  async verifyToken(userId: number, token: string): Promise<boolean> {
    const result = await pool.query(
      'SELECT two_factor_secret FROM users WHERE id = $1',
      [userId],
    );
    const secret = result.rows[0]?.two_factor_secret;
    if (!secret) return false;

    const { valid } = await verify({ token, secret });
    return valid;
  }

  async generateBackupCodes(userId: number): Promise<string[]> {
    const codes = Array.from({ length: 8 }, () =>
      crypto.randomBytes(4).toString('hex'),
    );
    await pool.query(
      'UPDATE users SET two_factor_backup_codes = $1 WHERE id = $2',
      [JSON.stringify(codes), userId],
    );
    return codes;
  }

  async enableTwoFactor(userId: number): Promise<void> {
    await pool.query(
      'UPDATE users SET two_factor_enabled = true WHERE id = $1',
      [userId],
    );
  }

  async disableTwoFactor(userId: number): Promise<void> {
    await pool.query(
      'UPDATE users SET two_factor_enabled = false, two_factor_secret = NULL, two_factor_backup_codes = NULL WHERE id = $1',
      [userId],
    );
  }

  async verifyBackupCode(userId: number, code: string): Promise<boolean> {
    const result = await pool.query(
      'SELECT two_factor_backup_codes FROM users WHERE id = $1',
      [userId],
    );
    const codes: string[] = JSON.parse(result.rows[0]?.two_factor_backup_codes || '[]');
    const index = codes.indexOf(code);
    if (index === -1) return false;

    codes.splice(index, 1);
    await pool.query(
      'UPDATE users SET two_factor_backup_codes = $1 WHERE id = $2',
      [JSON.stringify(codes), userId],
    );
    return true;
  }
}
