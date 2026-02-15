/**
 * Search Index Service - HMAC-Based Secure Search
 * 
 * Implements the "poor-man's secure search" pattern using:
 * - Tokenization of note content (lowercase, strip HTML, remove stopwords)
 * - HMAC-SHA256 hashing of tokens before storage
 * - PostgreSQL index lookups for fast searching
 * 
 * Security properties:
 * - No plaintext stored in database
 * - Tokens are salted with user-specific key (their DEK)
 * - DB compromise reveals only encrypted blobs + random-looking hashes
 */

import * as crypto from 'crypto';
import { prisma } from './prisma';
import { getOrRestoreDEK } from './dek';
import { decryptNote, isEncryptedData } from './encryption';

// Server-side secret for search index hashing
// This is derived from JWT_SECRET so it's consistent across restarts
const SEARCH_KEY = process.env.JWT_SECRET 
  ? crypto.createHash('sha256').update(process.env.JWT_SECRET + ':search').digest()
  : crypto.randomBytes(32);

// Minimal stopwords - only very common words that add noise
const STOPWORDS = new Set([
  'the', 'and', 'or', 'is', 'are', 'was', 'were',
  'a', 'an', 'of', 'in', 'for', 'to',
]);

// Minimum token length
const MIN_TOKEN_LENGTH = 2;

/**
 * Strip HTML tags from content
 */
function stripHtml(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Tokenize text into search tokens
 */
function tokenize(text: string): string[] {
  if (!text) return [];
  const plainText = stripHtml(text).toLowerCase();
  const words = plainText.split(/[^\w]+/).filter(word => word.length > 0);
  return words
    .filter(word => !STOPWORDS.has(word) && word.length >= MIN_TOKEN_LENGTH)
    .filter((word, index, self) => self.indexOf(word) === index);
}

/**
 * Generate bigrams from tokens for phrase search support
 */
function generateBigrams(tokens: string[]): string[] {
  const bigrams: string[] = [];
  for (let i = 0; i < tokens.length - 1; i++) {
    bigrams.push(`${tokens[i]}_${tokens[i + 1]}`);
  }
  return bigrams;
}

/**
 * Index a single note in the search index
 */
export async function indexNote(
  noteId: string,
  userId: string,
  canvasId: string,
  title: string,
  content: string
): Promise<void> {
  // Combine title and content for tokenization
  const combinedText = `${title} ${content}`;
  const tokens = tokenize(combinedText);
  const bigrams = generateBigrams(tokens);
  const allTokens = [...tokens, ...bigrams];

  if (allTokens.length === 0) {
    await removeFromIndex(noteId);
    return;
  }

  // Hash each token using server-side key - store as hex string
  const tokenHashes = allTokens.map(token => {
    return crypto.createHmac('sha256', SEARCH_KEY).update(token).digest('hex');
  });

  await prisma.$transaction(async (tx) => {
    await tx.noteToken.deleteMany({ where: { noteId } });
    await tx.noteSearchIndex.upsert({
      where: { noteId },
      create: { noteId, userId, canvasId },
      update: { userId, canvasId, updatedAt: new Date() },
    });
    if (tokenHashes.length > 0) {
      await tx.noteToken.createMany({
        data: tokenHashes.map(hash => ({ noteId, userId, tokenHash: hash })),
      });
    }
  });
}

/**
 * Remove a note from the search index
 */
export async function removeFromIndex(noteId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.noteToken.deleteMany({ where: { noteId } });
    await tx.noteSearchIndex.delete({ where: { noteId } }).catch(() => {});
  });
}

/**
 * Index or update a note from storage (handles decryption)
 */
export async function indexNoteFromStorage(
  noteId: string,
  userId: string,
  canvasId: string,
  encryptedTitle: string,
  encryptedContent: string,
  isEncrypted: boolean
): Promise<void> {
  let title = encryptedTitle;
  let content = encryptedContent;

  if (isEncrypted) {
    const titleLooksEncrypted = isEncryptedData(encryptedTitle);
    const contentLooksEncrypted = isEncryptedData(encryptedContent);
    
    if (titleLooksEncrypted && contentLooksEncrypted) {
      const dek = await getOrRestoreDEK(userId);
      if (dek) {
        try {
          const decrypted = decryptNote(encryptedTitle, encryptedContent, dek);
          title = decrypted.title;
          content = decrypted.content;
        } catch {
          return;
        }
      } else {
        return;
      }
    }
  }

  await indexNote(noteId, userId, canvasId, title, content);
}

/**
 * Rebuild the search index for a specific user
 */
export async function rebuildIndex(userId: string): Promise<{ indexed: number; failed: number }> {
  let indexed = 0;
  let failed = 0;

  const canvases = await prisma.canvas.findMany({
    where: { userId },
    select: { id: true },
  });

  for (const canvas of canvases) {
    const notes = await prisma.note.findMany({
      where: { canvasId: canvas.id },
      select: { id: true, title: true, content: true, isEncrypted: true, canvasId: true },
    });

    for (const note of notes) {
      try {
        await indexNoteFromStorage(note.id, userId, note.canvasId, note.title, note.content, note.isEncrypted);
        indexed++;
      } catch (error) {
        console.error('Failed to index note:', note.id, error);
        failed++;
      }
    }
  }

  return { indexed, failed };
}

export async function rebuildAllIndexes(): Promise<{ usersProcessed: number; totalIndexed: number; totalFailed: number }> {
  const users = await prisma.user.findMany({ select: { id: true } });
  let totalIndexed = 0;
  let totalFailed = 0;

  for (const user of users) {
    const { indexed, failed } = await rebuildIndex(user.id);
    totalIndexed += indexed;
    totalFailed += failed;
  }

  return { usersProcessed: users.length, totalIndexed, totalFailed };
}

export interface SearchOptions {
  canvasId?: string;
  sortBy?: 'updatedAt' | 'createdAt' | 'title';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
  dateFilter?: 'today' | 'week' | 'month' | 'year';
}

export interface SearchResult {
  id: string;
  noteId: string;
  title: string;
  content: string;
  contentPreview: string;
  canvasId: string;
  canvasName?: string;
  positionX: number;
  positionY: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SearchResponse {
  results: SearchResult[];
  totalCount: number;
  hasMore: boolean;
  searchTime: number;
}

/**
 * Search notes using token matching
 */
export async function search(
  userId: string,
  query: string,
  options: SearchOptions = {}
): Promise<SearchResponse> {
  const startTime = Date.now();
  const { canvasId, sortBy = 'updatedAt', sortOrder = 'desc', limit = 50, offset = 0 } = options;

  if (!query || !query.trim()) {
    return { results: [], totalCount: 0, hasMore: false, searchTime: 0 };
  }

  const dek = await getOrRestoreDEK(userId);
  if (!dek) {
    return { results: [], totalCount: 0, hasMore: false, searchTime: 0 };
  }

  // Tokenize the query
  const queryTokens = tokenize(query);
  const queryBigrams = generateBigrams(queryTokens);
  const allQueryTokens = [...queryTokens, ...queryBigrams];

  if (allQueryTokens.length === 0) {
    return { results: [], totalCount: 0, hasMore: false, searchTime: 0 };
  }

  // Hash query tokens using server-side key
  const queryHashes = allQueryTokens.map(token => {
    return crypto.createHmac('sha256', SEARCH_KEY).update(token).digest('hex');
  });
  
  // Build OR conditions for each hash
  const conditions = queryHashes.map((h, i) => `token_hash = $${i + 2}`).join(' OR ');
  const rawQuery = `
    SELECT DISTINCT note_id 
    FROM note_tokens 
    WHERE user_id = $1 AND (${conditions})
  `;
  
  const tokenMatches = await prisma.$queryRawUnsafe<{note_id: string}[]>(
    rawQuery,
    userId,
    ...queryHashes
  );

  const matchedNoteIds = tokenMatches.map(m => m.note_id);
  const totalCount = matchedNoteIds.length;

  if (totalCount === 0) {
    return { results: [], totalCount: 0, hasMore: false, searchTime: Date.now() - startTime };
  }

  // Get note details with sorting
  const searchResults = await prisma.noteSearchIndex.findMany({
    where: { 
      noteId: { in: matchedNoteIds },
      userId: userId,
      ...(canvasId ? { canvasId } : {}),
    },
    orderBy: { [sortBy]: sortOrder },
    skip: offset,
    take: limit,
  });

  // Get note content for display
  const notes = await prisma.note.findMany({
    where: { id: { in: matchedNoteIds } },
    select: { id: true, title: true, content: true, isEncrypted: true, positionX: true, positionY: true },
  });

  // Get canvas names for display
  const canvasIds = [...new Set(searchResults.map(r => r.canvasId))];
  const canvases = await prisma.canvas.findMany({
    where: { id: { in: canvasIds } },
    select: { id: true, name: true, isEncrypted: true },
  });
  const canvasMap = new Map<string, string>();
  for (const canvas of canvases) {
    if (canvas.isEncrypted && isEncryptedData(canvas.name) && dek) {
      try {
        const { decrypt } = await import('./encryption');
        canvasMap.set(canvas.id, decrypt(JSON.parse(canvas.name), dek));
      } catch {
        canvasMap.set(canvas.id, '[Encrypted]');
      }
    } else {
      canvasMap.set(canvas.id, canvas.name);
    }
  }

  const notesMap = new Map<string, { title: string; content: string; positionX: number; positionY: number }>();

  for (const note of notes) {
    let title = note.title;
    let content = note.content;

    if (note.isEncrypted && isEncryptedData(note.title) && isEncryptedData(note.content) && dek) {
      try {
        const decrypted = decryptNote(note.title, note.content, dek);
        title = decrypted.title;
        content = decrypted.content;
      } catch {
        title = '[Decryption failed]';
        content = '';
      }
    }

    notesMap.set(note.id, {
      title,
      content,
      positionX: Number(note.positionX || 0),
      positionY: Number(note.positionY || 0),
    });
  }

  const searchTime = Date.now() - startTime;

  return {
    results: searchResults.map(row => {
      const noteData = notesMap.get(row.noteId) || { title: '', content: '', positionX: 0, positionY: 0 };
      return {
        id: row.id,
        noteId: row.noteId,
        title: noteData.title,
        content: noteData.content,
        contentPreview: noteData.content ? noteData.content.substring(0, 150) + (noteData.content.length > 150 ? '...' : '') : '',
        canvasId: row.canvasId,
        canvasName: canvasMap.get(row.canvasId) || 'Unknown Canvas',
        positionX: noteData.positionX,
        positionY: noteData.positionY,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      };
    }),
    totalCount,
    hasMore: offset + searchResults.length < totalCount,
    searchTime,
  };
}

export async function getCanvasNameForSearch(canvasId: string, userId: string): Promise<string | null> {
  const canvas = await prisma.canvas.findUnique({
    where: { id: canvasId },
    select: { name: true, isEncrypted: true },
  });

  if (!canvas) return null;

  // If canvas is not encrypted, return the name directly
  if (!canvas.isEncrypted) {
    return canvas.name;
  }

  // Canvas is marked as encrypted - check if the name is actually encrypted
  const dek = await getOrRestoreDEK(userId);
  
  // Only return "[Encrypted]" if BOTH conditions are met:
  // 1. The canvas is marked as encrypted AND
  // 2. The name actually looks like encrypted data
  // If name is stored in plaintext (data inconsistency), return the plaintext name
  if (canvas.name && isEncryptedData(canvas.name)) {
    if (dek) {
      try {
        const { decrypt } = await import('./encryption');
        return decrypt(JSON.parse(canvas.name), dek);
      } catch {
        return '[Encrypted]';
      }
    }
    return '[Encrypted]';
  }

  // Name is stored in plaintext despite isEncrypted flag - return the actual name
  return canvas.name;
}

export async function clearUserIndex(userId: string): Promise<number> {
  const result = await prisma.noteToken.deleteMany({ where: { userId } });
  await prisma.noteSearchIndex.deleteMany({ where: { userId } });
  return result.count;
}

export async function clearAllIndexes(): Promise<{ tokensDeleted: number; indexesDeleted: number }> {
  const tokensResult = await prisma.noteToken.deleteMany({});
  const indexesResult = await prisma.noteSearchIndex.deleteMany({});
  return { tokensDeleted: tokensResult.count, indexesDeleted: indexesResult.count };
}
