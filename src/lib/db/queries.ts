import { db } from '.';
import { eq, desc, and, sql, asc } from 'drizzle-orm';
import {
  proxies,
  users,
  categories,
  conversations,
  messages,
  queue,
  watchlist,
  leaderboard,
  pointEvents,
  contentChunks,
  ratings
} from './schema';
import type { NewProxy, NewUser } from './schema';

/* ---------- proxy queries ---------- */
export async function getProxyByHandle(handle: string) {
  const [p] = await db.select().from(proxies)
    .where(sql`lower(${proxies.xHandle}) = lower(${handle})`)
    .limit(1);
  return p ?? null;
}

export async function getProxyById(id: string) {
  const [p] = await db.select().from(proxies).where(eq(proxies.id, id)).limit(1);
  return p ?? null;
}

export async function getLiveProxies(limit = 20, offset = 0) {
  return db
    .select()
    .from(proxies)
    .where(eq(proxies.status, 'live'))
    .orderBy(desc(proxies.totalChats))
    .limit(limit)
    .offset(offset);
}

export async function getProxiesByCategory(categoryId: string, limit = 20) {
  return db
    .select()
    .from(proxies)
    .where(and(eq(proxies.status, 'live'), eq(proxies.categoryId, categoryId)))
    .orderBy(desc(proxies.totalChats))
    .limit(limit);
}

export async function createProxy(data: NewProxy) {
  const [p] = await db.insert(proxies).values(data).returning();
  return p;
}

export async function updateProxy(id: string, data: Partial<NewProxy>) {
  const [p] = await db
    .update(proxies)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(proxies.id, id))
    .returning();
  return p;
}

export async function getTopProxies(limit = 10) {
  return db
    .select()
    .from(proxies)
    .where(eq(proxies.status, 'live'))
    .orderBy(desc(proxies.totalChats))
    .limit(limit);
}

export async function getTrendingProxies(limit = 10) {
  return db
    .select()
    .from(proxies)
    .where(eq(proxies.status, 'live'))
    .orderBy(desc(proxies.priceChange24h))
    .limit(limit);
}

/* ---------- user queries ---------- */
export async function getUserByPrivyId(privyId: string) {
  const [u] = await db.select().from(users).where(eq(users.privyId, privyId)).limit(1);
  return u ?? null;
}

export async function createUser(data: NewUser) {
  const [u] = await db.insert(users).values(data).returning();
  return u;
}

export async function upsertUser(data: NewUser) {
  const existing = await getUserByPrivyId(data.privyId);
  if (existing) {
    const [u] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, existing.id))
      .returning();
    return u;
  }
  return createUser(data);
}

/* ---------- category queries ---------- */
export async function getAllCategories() {
  return db.select().from(categories).orderBy(asc(categories.sortOrder));
}

/* ---------- conversation queries ---------- */
export async function createConversation(proxyId: string, userId: string) {
  const [c] = await db.insert(conversations).values({ proxyId, userId }).returning();
  return c;
}

export async function addMessage(
  conversationId: string,
  role: string,
  content: string,
  flagged = false
) {
  const [m] = await db
    .insert(messages)
    .values({ conversationId, role, content, flagged })
    .returning();
  await db
    .update(conversations)
    .set({ totalMessages: sql`${conversations.totalMessages} + 1` })
    .where(eq(conversations.id, conversationId));
  return m;
}

export async function getConversationMessages(conversationId: string) {
  return db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt));
}

/* ---------- queue queries ---------- */
export async function addToQueue(proxyId: string, messageId: string, question: string) {
  const [q] = await db.insert(queue).values({ proxyId, messageId, question }).returning();
  return q;
}

export async function getProxyQueue(proxyId: string) {
  return db
    .select()
    .from(queue)
    .where(and(eq(queue.proxyId, proxyId), eq(queue.status, 'pending')))
    .orderBy(desc(queue.createdAt));
}

export async function answerQueueItem(id: string, answer: string) {
  const [q] = await db
    .update(queue)
    .set({ answer, status: 'answered', answeredAt: new Date() })
    .where(eq(queue.id, id))
    .returning();
  return q;
}

export async function skipQueueItem(id: string) {
  const [q] = await db.update(queue).set({ status: 'skipped' }).where(eq(queue.id, id)).returning();
  return q;
}

/* ---------- watchlist queries ---------- */
export async function addToWatchlist(userId: string, proxyId: string) {
  const [w] = await db.insert(watchlist).values({ userId, proxyId }).returning();
  return w;
}

export async function removeFromWatchlist(userId: string, proxyId: string) {
  await db
    .delete(watchlist)
    .where(and(eq(watchlist.userId, userId), eq(watchlist.proxyId, proxyId)));
}

export async function getUserWatchlist(userId: string) {
  return db
    .select({ proxy: proxies })
    .from(watchlist)
    .innerJoin(proxies, eq(watchlist.proxyId, proxies.id))
    .where(eq(watchlist.userId, userId));
}

/* ---------- leaderboard queries ---------- */
export async function getLeaderboard(limit = 50) {
  return db
    .select({ leaderboard, user: users })
    .from(leaderboard)
    .innerJoin(users, eq(leaderboard.userId, users.id))
    .orderBy(desc(leaderboard.points))
    .limit(limit);
}

export async function addPointEvent(
  userId: string,
  action: string,
  points: number,
  metadata?: Record<string, unknown>
) {
  await db.insert(pointEvents).values({ userId, action, points, metadata });
  await db
    .update(users)
    .set({ points: sql`${users.points} + ${points}` })
    .where(eq(users.id, userId));
}

/* ---------- user update ---------- */
export async function updateUser(id: string, data: Partial<NewUser>) {
  const [u] = await db
    .update(users)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning();
  return u;
}

/* ---------- proxy by creator ---------- */
export async function getProxyByCreatorId(creatorId: string) {
  const [p] = await db.select().from(proxies).where(eq(proxies.creatorId, creatorId)).limit(1);
  return p ?? null;
}

/* ---------- ratings ---------- */
export async function rateProxy(proxyId: string, userId: string, score: number) {
  await db.insert(ratings).values({ proxyId, userId, score });
  const [avg] = await db
    .select({ avg: sql<number>`avg(${ratings.score})` })
    .from(ratings)
    .where(eq(ratings.proxyId, proxyId));
  await db.update(proxies).set({ rating: avg.avg }).where(eq(proxies.id, proxyId));
}

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
