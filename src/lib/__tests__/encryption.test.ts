/**
 * Unit tests for encryption library
 */

import { describe, it, expect } from 'vitest';
import {
  generateSalt,
  generateDEK,
  deriveKEK,
  wrapDEK,
  unwrapDEK,
  encrypt,
  decrypt,
  encryptNote,
  decryptNote,
  encryptCanvasName,
  decryptCanvasName,
  isEncryptedData,
  getDefaultKDFParams,
} from '../encryption';

describe('encryption', () => {
  describe('generateSalt', () => {
    it('should generate a base64 encoded salt', () => {
      const salt = generateSalt();
      expect(salt).toBeDefined();
      expect(typeof salt).toBe('string');
      // Base64 encoded 16 bytes should be ~24 characters
      expect(salt.length).toBeGreaterThan(20);
    });

    it('should generate unique salts each time', () => {
      const salt1 = generateSalt();
      const salt2 = generateSalt();
      expect(salt1).not.toBe(salt2);
    });
  });

  describe('generateDEK', () => {
    it('should generate a 32-byte buffer', () => {
      const dek = generateDEK();
      expect(dek).toBeInstanceOf(Buffer);
      expect(dek.length).toBe(32);
    });

    it('should generate unique DEKs each time', () => {
      const dek1 = generateDEK();
      const dek2 = generateDEK();
      expect(dek1.equals(dek2)).toBe(false);
    });
  });

  describe('deriveKEK', () => {
    it('should derive a 32-byte key from password and salt', async () => {
      const password = 'TestPassword123!';
      const salt = generateSalt();

      const kek = await deriveKEK(password, salt);

      expect(kek).toBeInstanceOf(Buffer);
      expect(kek.length).toBe(32);
    });

    it('should derive the same key for the same password and salt', async () => {
      const password = 'TestPassword123!';
      const salt = generateSalt();

      const kek1 = await deriveKEK(password, salt);
      const kek2 = await deriveKEK(password, salt);

      expect(kek1.equals(kek2)).toBe(true);
    });

    it('should derive different keys for different passwords', async () => {
      const salt = generateSalt();

      const kek1 = await deriveKEK('Password1', salt);
      const kek2 = await deriveKEK('Password2', salt);

      expect(kek1.equals(kek2)).toBe(false);
    });

    it('should derive different keys for different salts', async () => {
      const password = 'TestPassword123!';

      const kek1 = await deriveKEK(password, generateSalt());
      const kek2 = await deriveKEK(password, generateSalt());

      expect(kek1.equals(kek2)).toBe(false);
    });
  });

  describe('wrapDEK and unwrapDEK', () => {
    it('should wrap and unwrap a DEK correctly', async () => {
      const password = 'TestPassword123!';
      const salt = generateSalt();
      const dek = generateDEK();

      const kek = await deriveKEK(password, salt);
      const wrapped = wrapDEK(dek, kek);
      const unwrapped = unwrapDEK(wrapped, kek);

      expect(unwrapped.equals(dek)).toBe(true);
    });

    it('should fail to unwrap with wrong KEK', async () => {
      const password = 'TestPassword123!';
      const salt = generateSalt();
      const dek = generateDEK();

      const kek = await deriveKEK(password, salt);
      const wrongKek = await deriveKEK('WrongPassword', salt);
      const wrapped = wrapDEK(dek, kek);

      expect(() => unwrapDEK(wrapped, wrongKek)).toThrow();
    });
  });

  describe('encrypt and decrypt', () => {
    it('should encrypt and decrypt data correctly', async () => {
      const plaintext = 'Hello, World! This is a test message.';
      const key = generateDEK();

      const encrypted = encrypt(plaintext, key);
      expect(encrypted.ciphertext).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.authTag).toBeDefined();

      const decrypted = decrypt(encrypted, key);
      expect(decrypted).toBe(plaintext);
    });

    it('should encrypt and decrypt Unicode text correctly', async () => {
      const plaintext = '你好世界! 🌍 émojis and ñ';
      const key = generateDEK();

      const encrypted = encrypt(plaintext, key);
      const decrypted = decrypt(encrypted, key);

      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertext for same plaintext (due to random IV)', async () => {
      const plaintext = 'Hello, World!';
      const key = generateDEK();

      const encrypted1 = encrypt(plaintext, key);
      const encrypted2 = encrypt(plaintext, key);

      expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
    });

    it('should fail to decrypt with wrong key', async () => {
      const plaintext = 'Secret message';
      const key = generateDEK();
      const wrongKey = generateDEK();

      const encrypted = encrypt(plaintext, key);

      expect(() => decrypt(encrypted, wrongKey)).toThrow();
    });
  });

  describe('encryptNote and decryptNote', () => {
    it('should encrypt and decrypt note title and content correctly', async () => {
      const title = 'My Test Note';
      const content = 'This is the content of my test note.';
      const dek = generateDEK();

      const encrypted = encryptNote(title, content, dek);
      expect(encrypted.encryptedTitle).toBeDefined();
      expect(encrypted.encryptedContent).toBeDefined();

      const decrypted = decryptNote(encrypted.encryptedTitle, encrypted.encryptedContent, dek);
      expect(decrypted.title).toBe(title);
      expect(decrypted.content).toBe(content);
    });

    it('should handle empty content', async () => {
      const title = 'Empty Note';
      const content = '';
      const dek = generateDEK();

      const encrypted = encryptNote(title, content, dek);
      const decrypted = decryptNote(encrypted.encryptedTitle, encrypted.encryptedContent, dek);

      expect(decrypted.title).toBe(title);
      expect(decrypted.content).toBe(content);
    });

    it('should handle Unicode in title and content', async () => {
      const title = '日本語のノート';
      const content = 'This contains émojis 🎉 and ñ';
      const dek = generateDEK();

      const encrypted = encryptNote(title, content, dek);
      const decrypted = decryptNote(encrypted.encryptedTitle, encrypted.encryptedContent, dek);

      expect(decrypted.title).toBe(title);
      expect(decrypted.content).toBe(content);
    });
  });

  describe('isEncryptedData', () => {
    it('should return true for valid encrypted data', async () => {
      const plaintext = 'Test message';
      const key = generateDEK();
      const encrypted = encrypt(plaintext, key);
      const encryptedJson = JSON.stringify(encrypted);

      expect(isEncryptedData(encryptedJson)).toBe(true);
    });

    it('should return false for plain text', () => {
      expect(isEncryptedData('plain text')).toBe(false);
      expect(isEncryptedData('')).toBe(false);
    });

    it('should return false for invalid JSON', () => {
      expect(isEncryptedData('not valid json {')).toBe(false);
    });

    it('should return false for JSON without required fields', () => {
      expect(isEncryptedData(JSON.stringify({ foo: 'bar' }))).toBe(false);
      expect(isEncryptedData(JSON.stringify({ ciphertext: 'test' }))).toBe(false);
    });

    it('should return true for encrypted data with version field', async () => {
      const plaintext = 'Test';
      const key = generateDEK();
      const encrypted = encrypt(plaintext, key);
      encrypted.version = 1;
      const encryptedJson = JSON.stringify(encrypted);

      expect(isEncryptedData(encryptedJson)).toBe(true);
    });
  });

  describe('getDefaultKDFParams', () => {
    it('should return valid KDF parameters', () => {
      const params = getDefaultKDFParams();

      expect(params.iterations).toBeDefined();
      expect(params.memoryCost).toBeDefined();
      expect(params.parallelism).toBeDefined();
      expect(typeof params.iterations).toBe('number');
      expect(typeof params.memoryCost).toBe('number');
      expect(typeof params.parallelism).toBe('number');
    });
  });

  describe('encryptCanvasName and decryptCanvasName', () => {
    it('should encrypt and decrypt canvas name correctly', () => {
      const name = 'My Canvas';
      const dek = generateDEK();

      const encrypted = encryptCanvasName(name, dek);
      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');

      // Should be valid JSON
      const parsed = JSON.parse(encrypted);
      expect(parsed.ciphertext).toBeDefined();
      expect(parsed.iv).toBeDefined();
      expect(parsed.authTag).toBeDefined();

      const decrypted = decryptCanvasName(encrypted, dek);
      expect(decrypted).toBe(name);
    });

    it('should handle empty canvas name', () => {
      const name = '';
      const dek = generateDEK();

      const encrypted = encryptCanvasName(name, dek);
      const decrypted = decryptCanvasName(encrypted, dek);

      expect(decrypted).toBe(name);
    });

    it('should handle Unicode canvas names', () => {
      const name = '日本語キャンバス';
      const dek = generateDEK();

      const encrypted = encryptCanvasName(name, dek);
      const decrypted = decryptCanvasName(encrypted, dek);

      expect(decrypted).toBe(name);
    });

    it('should produce different ciphertext for same name (due to random IV)', () => {
      const name = 'Canvas';
      const dek = generateDEK();

      const encrypted1 = encryptCanvasName(name, dek);
      const encrypted2 = encryptCanvasName(name, dek);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should throw on invalid encrypted data format', () => {
      const dek = generateDEK();

      expect(() => decryptCanvasName('invalid-json', dek)).toThrow();
      expect(() => decryptCanvasName('{"foo": "bar"}', dek)).toThrow();
    });
  });
});
