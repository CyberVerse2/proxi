import { desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { botState, contentChunks } from '@/lib/db/schema';

/* ---------- content chunks (for AI pipeline) ---------- */
export async function storeChunks(
  chunks: {
    proxyId: string;
    contentType: 'tweet' | 'reply' | 'thread' | 'private_note';
    originalText: string;
    processedText?: string;
    tweetId?: string;
    priority?: number;
    qualityScore?: number;
    embedding?: number[];
  }[]
) {
  if (chunks.length === 0) return;
  return db.insert(contentChunks).values(chunks);
}

export async function getProxyChunks(proxyId: string, limit = 500) {
  return db
    .select()
    .from(contentChunks)
    .where(eq(contentChunks.proxyId, proxyId))
    .orderBy(desc(contentChunks.priority))
    .limit(limit);
}

/* ---------- bot state (key-value) ---------- */
export async function getBotState(key: string): Promise<string | null> {
  const [row] = await db
    .select()
    .from(botState)
    .where(eq(botState.key, key))
    .limit(1);
  return row?.value ?? null;
}

export async function setBotState(key: string, value: string): Promise<void> {
  await db
    .insert(botState)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: botState.key,
      set: { value, updatedAt: new Date() }
    });
}
