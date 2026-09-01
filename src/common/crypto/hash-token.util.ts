import * as crypto from 'crypto';

/**
 * SHA-256, not bcrypt. Refresh tokens are 384 bits of crypto.randomBytes
 * entropy, not a user-chosen low-entropy secret — bcrypt's deliberate
 * slowness defends against brute-forcing something guessable; there's
 * nothing to brute-force here, so the extra latency (on a lookup that
 * now runs on every single request) would cost real performance for
 * zero security benefit. bcrypt stays reserved for passwords.
 */
export function hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
}