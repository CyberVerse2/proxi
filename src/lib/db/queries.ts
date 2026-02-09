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
  ratings,
  botState,
} from './schema';
import type { NewProxy, NewUser } from './schema';

/* ---------- proxy queries ---------- */
export async function getProxyByHandle(handle: string) {
  const [p] = await db
    .select()
    .from(proxies)
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

export async function getNewestProxies(limit = 8) {
  return db
    .select()
    .from(proxies)
    .where(eq(proxies.status, 'live'))
    .orderBy(desc(proxies.createdAt))
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

export async function getUserByXHandle(xHandle: string) {
  const [u] = await db
    .select()
    .from(users)
    .where(sql`lower(${users.xHandle}) = lower(${xHandle})`)
    .limit(1);
  return u ?? null;
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

export async function getCategoryBySlug(slug: string) {
  const [c] = await db
    .select()
    .from(categories)
    .where(eq(categories.slug, slug))
    .limit(1);
  return c ?? null;
}

/* ---------- conversation queries ---------- */
export async function createConversation(proxyId: string, userId: string, title?: string) {
  const [c] = await db
    .insert(conversations)
    .values({ proxyId, userId, title: title ?? null })
    .returning();

  // Increment the proxy's total chat count
  await db
    .update(proxies)
    .set({ totalChats: sql`${proxies.totalChats} + 1` })
    .where(eq(proxies.id, proxyId));

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
    .set({
      totalMessages: sql`${conversations.totalMessages} + 1`,
      updatedAt: new Date(),
    })
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

export async function getUserConversations(userId: string, proxyId: string) {
  return db
    .select({
      id: conversations.id,
      title: conversations.title,
      updatedAt: conversations.updatedAt,
      totalMessages: conversations.totalMessages,
    })
    .from(conversations)
    .where(and(eq(conversations.userId, userId), eq(conversations.proxyId, proxyId)))
    .orderBy(desc(conversations.updatedAt));
}

export async function updateConversationTitle(conversationId: string, title: string) {
  await db
    .update(conversations)
    .set({ title })
    .where(eq(conversations.id, conversationId));
}

export async function getConversationById(conversationId: string) {
  const [c] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1);
  return c ?? null;
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

/* ---------- proxy message count (live from conversations) ---------- */
export async function getProxyMessageCount(proxyId: string): Promise<number> {
  const [row] = await db
    .select({
      total: sql<number>`coalesce(sum(${conversations.totalMessages}), 0)`,
    })
    .from(conversations)
    .where(eq(conversations.proxyId, proxyId));
  return Number(row?.total ?? 0);
}

/* ---------- recent conversations (across all proxies for a user) ---------- */
export async function getUserRecentConversations(userId: string, limit = 10) {
  return db
    .select({
      id: conversations.id,
      title: conversations.title,
      updatedAt: conversations.updatedAt,
      totalMessages: conversations.totalMessages,
      proxyHandle: proxies.xHandle,
      proxyName: proxies.displayName,
      proxyAvatar: proxies.avatarUrl,
    })
    .from(conversations)
    .innerJoin(proxies, eq(conversations.proxyId, proxies.id))
    .where(eq(conversations.userId, userId))
    .orderBy(desc(conversations.updatedAt))
    .limit(limit);
}

/* ---------- ratings / reviews ---------- */
export async function rateProxy(proxyId: string, userId: string, score: number) {
  await db.insert(ratings).values({ proxyId, userId, score });
  await recalcProxyRating(proxyId);
}

export async function submitReview(
  proxyId: string,
  userId: string,
  score: number,
  reviewText?: string,
) {
  // Check if user already reviewed this proxy
  const [existing] = await db
    .select({ id: ratings.id })
    .from(ratings)
    .where(and(eq(ratings.proxyId, proxyId), eq(ratings.userId, userId)))
    .limit(1);

  if (existing) {
    // Update existing review
    await db
      .update(ratings)
      .set({ score, reviewText: reviewText ?? null })
      .where(eq(ratings.id, existing.id));
  } else {
    // Insert new review
    await db.insert(ratings).values({ proxyId, userId, score, reviewText: reviewText ?? null });
  }

  await recalcProxyRating(proxyId);
}

async function recalcProxyRating(proxyId: string) {
  const [avg] = await db
    .select({ avg: sql<number>`avg(${ratings.score})` })
    .from(ratings)
    .where(eq(ratings.proxyId, proxyId));
  await db.update(proxies).set({ rating: avg.avg }).where(eq(proxies.id, proxyId));
}

export async function getProxyReviews(proxyId: string, limit = 50) {
  return db
    .select({
      id: ratings.id,
      score: ratings.score,
      reviewText: ratings.reviewText,
      createdAt: ratings.createdAt,
      userName: users.displayName,
      userHandle: users.xHandle,
      userAvatar: users.xProfileImageUrl,
    })
    .from(ratings)
    .innerJoin(users, eq(ratings.userId, users.id))
    .where(eq(ratings.proxyId, proxyId))
    .orderBy(desc(ratings.createdAt))
    .limit(limit);
}

export async function getProxyReviewCount(proxyId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(ratings)
    .where(eq(ratings.proxyId, proxyId));
  return Number(row?.count ?? 0);
}

export async function getUserReviewForProxy(userId: string, proxyId: string) {
  const [r] = await db
    .select()
    .from(ratings)
    .where(and(eq(ratings.userId, userId), eq(ratings.proxyId, proxyId)))
    .limit(1);
  return r ?? null;
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
      set: { value, updatedAt: new Date() },
    });
}
