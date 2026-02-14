import * as argon2 from 'argon2';
import * as crypto from 'crypto';

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 128 bits for GCM
const AUTH_TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 16; // 128 bits
const DEK_LENGTH = 32; // 256 bits

// Argon2id parameters (adjustable for security/performance balance)
const ARGON2_TIME_COST = 3; // Iterations
const ARGON2_MEMORY_COST = 65536; // 64 MB in KB
const ARGON2_PARALLELISM = 4;

export interface EncryptedData {
  ciphertext: string; // Base64 encoded
  iv: string; // Base64 encoded
  authTag: string; // Base64 encoded
  version?: number;
}

export interface KDFParams {
  iterations: number;
  memoryCost: number;
  parallelism: number;
}

/**
 * Generate a random salt for key derivation
 */
export function generateSalt(): string {
  return crypto.randomBytes(SALT_LENGTH).toString('base64');
}

/**
 * Generate a random Data Encryption Key (DEK)
 */
export function generateDEK(): Buffer {
  return crypto.randomBytes(DEK_LENGTH);
}

/**
 * Derive Key Encryption Key (KEK) from password using Argon2id
 */
export async function deriveKEK(
  password: string,
  saltBase64: string,
  params?: Partial<KDFParams>
): Promise<Buffer> {
  const salt = Buffer.from(saltBase64, 'base64');
  const timeCost = params?.iterations ?? ARGON2_TIME_COST;
  const memoryCost = params?.memoryCost ?? ARGON2_MEMORY_COST;
  const parallelism = params?.parallelism ?? ARGON2_PARALLELISM;

  try {
    const derivedKey = await argon2.hash(password, {
      type: argon2.argon2id,
      salt,
      timeCost,
      memoryCost,
      parallelism,
      hashLength: DEK_LENGTH,
      raw: true,
    });

    return derivedKey;
  } catch (error) {
    console.error('Error deriving KEK:', error);
    throw new Error('Failed to derive key encryption key');
  }
}

/**
 * Encrypt plaintext using AES-256-GCM
 */
export function encrypt(plaintext: string, key: Buffer): EncryptedData {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  let encrypted = cipher.update(plaintext, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    ciphertext: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
  };
}

/**
 * Decrypt ciphertext using AES-256-GCM
 */
export function decrypt(encryptedData: EncryptedData, key: Buffer): string {
  const iv = Buffer.from(encryptedData.iv, 'base64');
  const ciphertext = Buffer.from(encryptedData.ciphertext, 'base64');
  const authTag = Buffer.from(encryptedData.authTag, 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString('utf8');
}

/**
 * Wrap DEK with KEK for storage
 */
export function wrapDEK(dek: Buffer, kek: Buffer): EncryptedData {
  const encrypted = encrypt(dek.toString('base64'), kek);
  return {
    ...encrypted,
    version: 1,
  };
}

/**
 * Unwrap DEK from storage using KEK
 */
export function unwrapDEK(wrappedDEK: EncryptedData, kek: Buffer): Buffer {
  const decrypted = decrypt(wrappedDEK, kek);
  return Buffer.from(decrypted, 'base64');
}

/**
 * Encrypt note title and content
 */
export function encryptNote(
  title: string,
  content: string,
  dek: Buffer
): { encryptedTitle: string; encryptedContent: string } {
  const encryptedTitle = encrypt(title, dek);
  const encryptedContent = encrypt(content, dek);

  return {
    encryptedTitle: JSON.stringify(encryptedTitle),
    encryptedContent: JSON.stringify(encryptedContent),
  };
}

/**
 * Decrypt note title and content
 */
export function decryptNote(
  encryptedTitle: string,
  encryptedContent: string,
  dek: Buffer
): { title: string; content: string } {
  let titleData: EncryptedData;
  let contentData: EncryptedData;

  try {
    titleData = JSON.parse(encryptedTitle);
    contentData = JSON.parse(encryptedContent);
  } catch (error) {
    throw new Error('Invalid encrypted note data format');
  }

  const title = decrypt(titleData, dek);
  const content = decrypt(contentData, dek);

  return { title, content };
}

/**
 * Encrypt canvas name
 */
export function encryptCanvasName(
  name: string,
  dek: Buffer
): string {
  const encryptedName = encrypt(name, dek);
  return JSON.stringify(encryptedName);
}

/**
 * Decrypt canvas name
 */
export function decryptCanvasName(
  encryptedName: string,
  dek: Buffer
): string {
  let nameData: EncryptedData;

  try {
    nameData = JSON.parse(encryptedName);
  } catch (error) {
    throw new Error('Invalid encrypted canvas name data format');
  }

  return decrypt(nameData, dek);
}

/**
 * Check if a string is encrypted data (valid JSON with required fields)
 */
export function isEncryptedData(value: string): boolean {
  try {
    const parsed = JSON.parse(value);
    return (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof parsed.ciphertext === 'string' &&
      typeof parsed.iv === 'string' &&
      typeof parsed.authTag === 'string'
    );
  } catch {
    return false;
  }
}

/**
 * Get default KDF parameters
 */
export function getDefaultKDFParams(): KDFParams {
  return {
    iterations: ARGON2_TIME_COST,
    memoryCost: ARGON2_MEMORY_COST,
    parallelism: ARGON2_PARALLELISM,
  };
}
