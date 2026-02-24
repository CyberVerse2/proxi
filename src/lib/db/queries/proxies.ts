import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { conversations, proxies } from '@/lib/db/schema';
import type { NewProxy } from '@/lib/db/schema';

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

export async function getProxyByCreatorId(creatorId: string) {
  const [p] = await db.select().from(proxies).where(eq(proxies.creatorId, creatorId)).limit(1);
  return p ?? null;
}

/* ---------- proxy message count (live from conversations) ---------- */
export async function getProxyMessageCount(proxyId: string): Promise<number> {
  const [row] = await db
    .select({
      total: sql<number>`coalesce(sum(${conversations.totalMessages}), 0)`
    })
    .from(conversations)
    .where(eq(conversations.proxyId, proxyId));
  return Number(row?.total ?? 0);
}
