import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGO = 'aes-256-gcm';
const PREFIX = 'enc:';

function getKey(): Buffer {
  const raw = process.env.TOKEN_ENCRYPTION_KEY;
  if (!raw) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('TOKEN_ENCRYPTION_KEY is required in production');
    }
    return Buffer.alloc(32); // dev fallback: plaintext passthrough
  }
  return Buffer.from(raw, 'hex');
}

export function encryptToken(plain: string | null | undefined): string | null {
  if (plain == null) return null;
  const key = getKey();
  if (key.equals(Buffer.alloc(32))) {
    // dev passthrough — key not configured
    return plain;
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, tag, enc]).toString('base64');
}

export function decryptToken(
  ciphertext: string | null | undefined,
): string | null {
  if (ciphertext == null) return null;
  if (!ciphertext.startsWith(PREFIX)) return ciphertext; // legacy plaintext
  const key = getKey();
  if (key.equals(Buffer.alloc(32))) return ciphertext.slice(PREFIX.length);
  const raw = Buffer.from(ciphertext.slice(PREFIX.length), 'base64');
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const enc = raw.subarray(28);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString(
    'utf8',
  );
}
