/**
 * Crypto Utility — TripSync
 *
 * AES-256-GCM encryption for sensitive fields (bank account numbers, IFSC codes).
 * Key is derived from the JWT secret for now; in production use a dedicated KMS key.
 *
 * Format: `iv:authTag:ciphertext` (all hex-encoded, colon-separated)
 */

import crypto from 'crypto';
import { env } from './env.js';

const ALGORITHM = 'aes-256-gcm';

/**
 * Derive a 32-byte encryption key from the JWT secret.
 * In production, use a dedicated HSM/KMS key instead.
 */
function getEncryptionKey(): Buffer {
  return crypto.createHash('sha256').update(env.JWT_ACCESS_SECRET).digest();
}

/**
 * Encrypt a plaintext field using AES-256-GCM.
 * Returns a base64url-encoded string of format: `${iv}:${authTag}:${ciphertext}`
 */
export function encryptField(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12); // 96-bit IV for GCM
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    iv.toString('hex'),
    authTag.toString('hex'),
    encrypted.toString('hex'),
  ].join(':');
}

/**
 * Decrypt a field encrypted with encryptField().
 * Returns the original plaintext string, or throws on tamper/corruption.
 */
export function decryptField(encryptedValue: string): string {
  const key = getEncryptionKey();
  const parts = encryptedValue.split(':');

  if (parts.length !== 3) {
    throw new Error('Invalid encrypted field format');
  }

  const [ivHex, authTagHex, ciphertextHex] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const ciphertext = Buffer.from(ciphertextHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf8');
}

/**
 * Compute a fuzzy name-match score between two strings.
 * Uses normalized Levenshtein similarity (0.0 – 1.0).
 * Score of 0.65+ is considered a sufficient match for bank verification.
 *
 * Handles common real-world variations:
 * - Upper/lowercase normalization
 * - Removal of common suffixes (Pvt Ltd, LLP, etc.)
 * - Extra whitespace
 */
export function computeNameMatchScore(name1: string, name2: string): number {
  const normalize = (s: string) =>
    s
      .toUpperCase()
      .replace(/\b(PVT|PRIVATE|LIMITED|LTD|LLP|OPC|PROPRIETORSHIP|INDIA|ENTERPRISES|AND|&)\b/g, '')
      .replace(/[^A-Z0-9 ]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

  const n1 = normalize(name1);
  const n2 = normalize(name2);

  if (n1 === n2) return 1.0;
  if (!n1 || !n2) return 0.0;

  const dist = levenshtein(n1, n2);
  const maxLen = Math.max(n1.length, n2.length);
  return 1.0 - dist / maxLen;
}

/** Standard Levenshtein distance */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = [];

  for (let i = 0; i <= m; i++) {
    dp[i] = [i];
  }
  for (let j = 1; j <= n; j++) {
    dp[0][j] = j;
  }
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  return dp[m][n];
}
