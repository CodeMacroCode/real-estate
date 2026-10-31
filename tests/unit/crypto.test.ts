import { describe, it, expect } from 'vitest';
import { encryptPassword, decryptPassword } from '../../src/lib/auth/crypto';

describe('AES-256-GCM Password Encryption / Decryption', () => {
  it('encrypts plaintext into a 3-part base64 iv:tag:ciphertext string', () => {
    const raw = 'AdminSecret@2026';
    const encrypted = encryptPassword(raw);
    expect(encrypted).not.toBe(raw);
    const parts = encrypted.split(':');
    expect(parts.length).toBe(3);
  });

  it('correctly decrypts ciphertext back into the exact original plaintext', () => {
    const raw = 'P@ssw0rd!#$991';
    const encrypted = encryptPassword(raw);
    const decrypted = decryptPassword(encrypted);
    expect(decrypted).toBe(raw);
  });

  it('produces different ciphertexts for the same plaintext due to random IVs', () => {
    const raw = 'ConsistentPassword123';
    const enc1 = encryptPassword(raw);
    const enc2 = encryptPassword(raw);
    expect(enc1).not.toBe(enc2);
    expect(decryptPassword(enc1)).toBe(raw);
    expect(decryptPassword(enc2)).toBe(raw);
  });

  it('returns empty string when given malformed or invalid ciphertext', () => {
    expect(decryptPassword('')).toBe('');
    expect(decryptPassword('invalid-string-no-parts')).toBe('');
    expect(decryptPassword('a:b:c')).toBe('');
  });
});
