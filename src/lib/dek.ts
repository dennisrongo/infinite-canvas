/**
 * Shared DEK (Data Encryption Key) utilities
 * 
 * This module provides centralized DEK retrieval and caching functionality
 * to avoid code duplication across API routes.
 */

import { getDEK, cacheDEK } from './dek-cache';
import { getDEKCookie } from './auth';

/**
 * Get the DEK for a user, checking memory cache first, then cookie
 * 
 * @param userId - The user's ID
 * @returns The DEK Buffer if available, null otherwise
 */
export async function getOrRestoreDEK(userId: string): Promise<Buffer | null> {
  // First check memory cache
  let dek = getDEK(userId);

  if (dek) {
    return dek;
  }

  // Try to restore from cookie
  dek = await getDEKCookie();

  if (dek) {
    // Cache it in memory for future requests
    cacheDEK(userId, dek);
    return dek;
  }

  return null;
}

/**
 * Encrypt a name (for canvas, folder) using the DEK if available
 * 
 * @param name - The plaintext name to encrypt
 * @param userId - The user's ID to get DEK
 * @returns Object with encrypted name and encryption flag
 */
export async function encryptName(
  name: string,
  userId: string
): Promise<{ encryptedName: string; isEncrypted: boolean }> {
  const { encrypt } = await import('./encryption');
  const dek = await getOrRestoreDEK(userId);

  if (dek) {
    const encrypted = encrypt(name, dek);
    return {
      encryptedName: JSON.stringify(encrypted),
      isEncrypted: true,
    };
  }

  return {
    encryptedName: name,
    isEncrypted: false,
  };
}

/**
 * Result type for decrypted name
 */
export interface DecryptedNameResult {
  name: string;
  isDecrypted: boolean;
}

/**
 * Decrypt a name (for canvas, folder) using the DEK if available
 * 
 * @param storedName - The stored (potentially encrypted) name
 * @param isEncrypted - Whether the name is encrypted
 * @param userId - The user's ID to get DEK
 * @returns The decrypted name or fallback message
 */
export async function decryptName(
  storedName: string,
  isEncrypted: boolean,
  userId: string
): Promise<DecryptedNameResult> {
  const { decrypt, isEncryptedData } = await import('./encryption');
  const dek = await getOrRestoreDEK(userId);

  // If encrypted but no DEK available, show message to re-login
  if (isEncrypted && !dek) {
    return {
      name: '[Please log in to view]',
      isDecrypted: false,
    };
  }

  // If not marked as encrypted but looks like encrypted JSON, try to decrypt anyway
  const looksLikeEncryptedJson = storedName?.trim().startsWith('{');
  
  if ((isEncrypted || looksLikeEncryptedJson) && dek) {
    try {
      // Use isEncryptedData helper for proper validation
      if (isEncryptedData(storedName)) {
        const encryptedData = JSON.parse(storedName);
        const decrypted = decrypt(encryptedData, dek);
        return {
          name: decrypted,
          isDecrypted: true,
        };
      }
    } catch (error) {
      console.error('Failed to decrypt name:', error);
      if (isEncrypted) {
        return {
          name: '[Decryption Error]',
          isDecrypted: false,
        };
      }
    }
  }

  // Return original if not encrypted or decryption not possible
  return {
    name: storedName,
    isDecrypted: false,
  };
}

/**
 * Decrypt a name synchronously when DEK is already available
 * 
 * @param storedName - The stored (potentially encrypted) name
 * @param isEncrypted - Whether the name is encrypted
 * @param dek - The DEK Buffer
 * @returns The decrypted name or fallback message
 */
export function decryptNameWithDEK(
  storedName: string,
  isEncrypted: boolean,
  dek: Buffer
): DecryptedNameResult {
  const { decrypt, isEncryptedData } = require('./encryption');

  // If encrypted but no DEK available, show message to re-login
  if (isEncrypted && !dek) {
    return {
      name: '[Please log in to view]',
      isDecrypted: false,
    };
  }

  // If not marked as encrypted but looks like encrypted JSON, try to decrypt anyway
  const looksLikeEncryptedJson = storedName?.trim().startsWith('{');
  
  if ((isEncrypted || looksLikeEncryptedJson) && dek) {
    try {
      // Use isEncryptedData helper for proper validation
      if (isEncryptedData(storedName)) {
        const encryptedData = JSON.parse(storedName);
        const decrypted = decrypt(encryptedData, dek);
        return {
          name: decrypted,
          isDecrypted: true,
        };
      }
    } catch (error) {
      console.error('Failed to decrypt name:', error);
      if (isEncrypted) {
        return {
          name: '[Decryption Error]',
          isDecrypted: false,
        };
      }
    }
  }

  // Return original if not encrypted or decryption not possible
  return {
    name: storedName,
    isDecrypted: false,
  };
}
