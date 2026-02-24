import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { conversations, messages, proxies, queue, watchlist } from '@/lib/db/schema';

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
      updatedAt: new Date()
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
      totalMessages: conversations.totalMessages
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

/* ---------- user message count for a specific proxy (user-role only) ---------- */
export async function getUserProxyMessageCount(
  userId: string,
  proxyId: string
): Promise<number> {
  const [row] = await db
    .select({
      total: sql<number>`count(*)`
    })
    .from(messages)
    .innerJoin(conversations, eq(messages.conversationId, conversations.id))
    .where(
      and(
        eq(conversations.userId, userId),
        eq(conversations.proxyId, proxyId),
        eq(messages.role, 'user')
      )
    );
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
      proxyAvatar: proxies.avatarUrl
    })
    .from(conversations)
    .innerJoin(proxies, eq(conversations.proxyId, proxies.id))
    .where(eq(conversations.userId, userId))
    .orderBy(desc(conversations.updatedAt))
    .limit(limit);
}
