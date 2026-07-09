import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as crypto from 'crypto';

export interface EncryptedPayload {
  iv: string;
  ciphertext: string;
  tag: string;
}

@Injectable()
export class EncryptionService implements OnModuleInit {
  private readonly logger = new Logger('Encryption');
  private key: Buffer | null = null;

  onModuleInit() {
    const secret = process.env.KEY_ENCRYPTION_SECRET;
    if (!secret) {
      this.logger.warn(
        'KEY_ENCRYPTION_SECRET not set — encryption disabled. API keys will not be persisted.',
      );
      return;
    }
    if (secret.length < 64) {
      this.logger.error(
        'KEY_ENCRYPTION_SECRET must be at least 32 bytes (64 hex chars).',
      );
      return;
    }
    this.key = Buffer.from(secret, 'hex');
    this.logger.log('Encryption service initialized');
  }

  get isConfigured(): boolean {
    return this.key !== null;
  }

  encrypt(plaintext: string): EncryptedPayload {
    if (!this.key) {
      throw new Error(
        'Encryption not configured — KEY_ENCRYPTION_SECRET missing',
      );
    }
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.key, iv);

    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    return {
      iv: iv.toString('base64'),
      ciphertext: encrypted.toString('base64'),
      tag: tag.toString('base64'),
    };
  }

  decrypt(payload: EncryptedPayload): string {
    if (!this.key) {
      throw new Error(
        'Encryption not configured — KEY_ENCRYPTION_SECRET missing',
      );
    }
    const iv = Buffer.from(payload.iv, 'base64');
    const ciphertext = Buffer.from(payload.ciphertext, 'base64');
    const tag = Buffer.from(payload.tag, 'base64');

    const decipher = crypto.createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  }
}
