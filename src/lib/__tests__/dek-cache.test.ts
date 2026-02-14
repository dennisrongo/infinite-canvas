/**
 * Unit tests for DEK cache
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  cacheDEK,
  getDEK,
  clearDEK,
  clearAllDEKs,
  hasDEK,
  getCacheStats,
  stopCleanupTask,
} from '../dek-cache';
import { generateDEK } from '../encryption';

describe('dek-cache', () => {
  const testUserId = 'test-user-123';
  const testDek = generateDEK();

  beforeEach(() => {
    // Clear cache before each test
    clearAllDEKs();
  });

  afterEach(() => {
    // Clean up after each test
    clearAllDEKs();
  });

  describe('cacheDEK and getDEK', () => {
    it('should cache and retrieve a DEK', () => {
      cacheDEK(testUserId, testDek);
      const retrieved = getDEK(testUserId);
      
      expect(retrieved).toBeInstanceOf(Buffer);
      expect(retrieved?.equals(testDek)).toBe(true);
    });

    it('should return null for non-existent user', () => {
      const retrieved = getDEK('non-existent-user');
      expect(retrieved).toBeNull();
    });

    it('should cache DEK with custom TTL', () => {
      const shortTTL = 1000; // 1 second
      cacheDEK(testUserId, testDek, shortTTL);
      
      const retrieved = getDEK(testUserId);
      expect(retrieved?.equals(testDek)).toBe(true);
    });

    it('should overwrite existing DEK for same user', () => {
      const dek1 = generateDEK();
      const dek2 = generateDEK();
      
      cacheDEK(testUserId, dek1);
      cacheDEK(testUserId, dek2);
      
      const retrieved = getDEK(testUserId);
      expect(retrieved?.equals(dek2)).toBe(true);
    });
  });

  describe('clearDEK', () => {
    it('should remove a cached DEK', () => {
      cacheDEK(testUserId, testDek);
      clearDEK(testUserId);
      
      const retrieved = getDEK(testUserId);
      expect(retrieved).toBeNull();
    });

    it('should handle clearing non-existent DEK', () => {
      expect(() => clearDEK('non-existent')).not.toThrow();
    });
  });

  describe('clearAllDEKs', () => {
    it('should clear all cached DEKs', () => {
      cacheDEK('user1', generateDEK());
      cacheDEK('user2', generateDEK());
      cacheDEK('user3', generateDEK());
      
      clearAllDEKs();
      
      expect(getDEK('user1')).toBeNull();
      expect(getDEK('user2')).toBeNull();
      expect(getDEK('user3')).toBeNull();
    });
  });

  describe('hasDEK', () => {
    it('should return true for cached DEK', () => {
      cacheDEK(testUserId, testDek);
      expect(hasDEK(testUserId)).toBe(true);
    });

    it('should return false for non-existent user', () => {
      expect(hasDEK('non-existent')).toBe(false);
    });

    it('should return false after clearing DEK', () => {
      cacheDEK(testUserId, testDek);
      clearDEK(testUserId);
      expect(hasDEK(testUserId)).toBe(false);
    });
  });

  describe('getCacheStats', () => {
    it('should return empty stats for empty cache', () => {
      const stats = getCacheStats();
      
      expect(stats.size).toBe(0);
      expect(stats.entries).toEqual([]);
    });

    it('should return correct stats with entries', () => {
      cacheDEK('user1', generateDEK());
      cacheDEK('user2', generateDEK());
      
      const stats = getCacheStats();
      
      expect(stats.size).toBe(2);
      expect(stats.entries).toContain('user1');
      expect(stats.entries).toContain('user2');
    });
  });

  describe('TTL expiration', () => {
    it('should return null after TTL expires', async () => {
      // Use a very short TTL
      const shortTTL = 50; // 50ms
      cacheDEK(testUserId, testDek, shortTTL);
      
      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const retrieved = getDEK(testUserId);
      expect(retrieved).toBeNull();
    });
  });

  describe('cleanup task', () => {
    it('should stop cleanup task without error', () => {
      expect(() => stopCleanupTask()).not.toThrow();
    });
  });
});
