import { Injectable, Logger } from '@nestjs/common';
import { pool } from '../../db';
import * as crypto from 'crypto';

@Injectable()
export class TwoFactorService {
  private readonly logger = new Logger('TwoFactor');

  async generateSecret(userId: number): Promise<string> {
    const secret = crypto.randomBytes(20).toString('hex').slice(0, 32).toUpperCase();
    await pool.query(
      'UPDATE users SET two_factor_secret = $1 WHERE id = $2',
      [secret, userId],
    );
    return secret;
  }

  async verifyToken(userId: number, token: string): Promise<boolean> {
    // TOTP verification — implement RFC 6238 algorithm
    // For now, return false until full implementation
    this.logger.warn('2FA verification not yet implemented');
    return false;
  }

  async enableTwoFactor(userId: number): Promise<void> {
    await pool.query(
      'UPDATE users SET two_factor_enabled = true WHERE id = $1',
      [userId],
    );
  }

  async disableTwoFactor(userId: number): Promise<void> {
    await pool.query(
      'UPDATE users SET two_factor_enabled = false, two_factor_secret = NULL WHERE id = $1',
      [userId],
    );
  }
}
