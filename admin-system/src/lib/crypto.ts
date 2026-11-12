import crypto from 'crypto';

const DEFAULT_KEY_HEX = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

/**
 * Returns a 32-byte Buffer derived from process.env.ENCRYPTION_KEY.
 * Supports 64-char hex strings or falls back to SHA-256 digest of key string.
 */
export function getKeyBuffer(): Buffer {
  const envKey = process.env.ENCRYPTION_KEY || DEFAULT_KEY_HEX;
  if (/^[0-9a-fA-F]{64}$/.test(envKey)) {
    return Buffer.from(envKey, 'hex');
  }
  return crypto.createHash('sha256').update(envKey).digest();
}

/**
 * Strips all non-digit characters from a phone number string.
 * Example: '010-1234-5678' -> '01012345678'
 */
export function normalizePhone(raw: string): string {
  if (!raw) return '';
  return raw.replace(/\D/g, '');
}

/**
 * Encrypts a normalized phone number using AES-256-GCM.
 * Output format: 'ivHex:authTagHex:cipherTextHex'
 */
export function encryptPhone(phone: string): string {
  const key = getKeyBuffer();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const cleanPhone = normalizePhone(phone) || phone;
  let encrypted = cipher.update(cleanPhone, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts an AES-256-GCM encrypted phone string ('ivHex:authTagHex:cipherTextHex').
 */
export function decryptPhone(encrypted: string): string {
  if (!encrypted || !encrypted.includes(':')) {
    return encrypted;
  }

  const parts = encrypted.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted phone format. Expected iv:authTag:cipher');
  }

  const [ivHex, authTagHex, cipherHex] = parts;
  const key = getKeyBuffer();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(cipherHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Masks a phone number for safe listing display.
 * Example: '01012345678' -> '010-****-5678'
 */
export function maskPhone(phone: string): string {
  const digits = normalizePhone(phone);
  if (!digits) return '';

  if (digits.length === 11) {
    return `${digits.slice(0, 3)}-****-${digits.slice(7)}`;
  } else if (digits.length === 10) {
    return `${digits.slice(0, 3)}-***-${digits.slice(6)}`;
  } else if (digits.length >= 7) {
    const end = digits.slice(-4);
    const start = digits.slice(0, 3);
    return `${start}-****-${end}`;
  }

  return '***';
}

export { formatPhone } from './format';

/**
 * Computes deterministic HMAC-SHA256 hash of a normalized phone number
 * for indexing, searching, and duplicate submission prevention.
 */
export function hashPhone(phone: string): string {
  const digits = normalizePhone(phone);
  const key = getKeyBuffer();
  return crypto.createHmac('sha256', key).update(digits).digest('hex');
}
