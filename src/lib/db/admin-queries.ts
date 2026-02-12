import { db } from ".";
import { eq, sql, desc, ilike, and, gte } from "drizzle-orm";
import {
  users,
  proxies,
  conversations,
  messages,
  contentChunks,
  ingestionLogs,
  queue,
  proxyTokens,
} from "./schema";

/* ─────────────────────────────────────────────────────────── */
/*  Period helpers                                              */
/* ─────────────────────────────────────────────────────────── */

export type StatsPeriod = "24h" | "7d" | "30d" | "all";

function periodToDate(period: StatsPeriod): Date | null {
  if (period === "all") return null;
  const now = new Date();
  switch (period) {
    case "24h":
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case "7d":
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case "30d":
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
}

/* ─────────────────────────────────────────────────────────── */
/*  Overview stats                                             */
/* ─────────────────────────────────────────────────────────── */

export async function getAdminStats(period: StatsPeriod = "all") {
  const since = periodToDate(period);

  // Build date-filtered count helpers
  const countUsers = since
    ? db.select({ count: sql<number>`count(*)` }).from(users).where(gte(users.createdAt, since))
    : db.select({ count: sql<number>`count(*)` }).from(users);

  const countProxies = since
    ? db.select({ count: sql<number>`count(*)` }).from(proxies).where(gte(proxies.createdAt, since))
    : db.select({ count: sql<number>`count(*)` }).from(proxies);

  const countMessages = since
    ? db.select({ count: sql<number>`count(*)` }).from(messages).where(gte(messages.createdAt, since))
    : db.select({ count: sql<number>`count(*)` }).from(messages);

  const countConversations = since
    ? db.select({ count: sql<number>`count(*)` }).from(conversations).where(gte(conversations.startedAt, since))
    : db.select({ count: sql<number>`count(*)` }).from(conversations);

  const countChunks = since
    ? db.select({ count: sql<number>`count(*)` }).from(contentChunks).where(gte(contentChunks.createdAt, since))
    : db.select({ count: sql<number>`count(*)` }).from(contentChunks);

  const [[userCount], [proxyCount], [messageCount], [conversationCount], [chunkCount], [volumeSum]] =
    await Promise.all([
      countUsers,
      countProxies,
      countMessages,
      countConversations,
      countChunks,
      // Volume is always the current snapshot (sum of rolling 24h volume across all proxies)
      db.select({ total: sql<number>`coalesce(sum(${proxies.volume24h}), 0)` }).from(proxies),
    ]);

  // Proxy counts by status (filtered by period)
  const statusQuery = since
    ? db
        .select({ status: proxies.status, count: sql<number>`count(*)` })
        .from(proxies)
        .where(gte(proxies.createdAt, since))
        .groupBy(proxies.status)
    : db
        .select({ status: proxies.status, count: sql<number>`count(*)` })
        .from(proxies)
        .groupBy(proxies.status);

  const statusRows = await statusQuery;

  const proxyByStatus: Record<string, number> = {};
  for (const row of statusRows) {
    proxyByStatus[row.status] = Number(row.count);
  }

  return {
    totalUsers: Number(userCount?.count ?? 0),
    totalProxies: Number(proxyCount?.count ?? 0),
    totalMessages: Number(messageCount?.count ?? 0),
    totalConversations: Number(conversationCount?.count ?? 0),
    totalChunks: Number(chunkCount?.count ?? 0),
    totalVolume24h: Number(volumeSum?.total ?? 0),
    proxyByStatus,
  };
}

/* ─────────────────────────────────────────────────────────── */
/*  Proxies (paginated, filterable, searchable)                */
/* ─────────────────────────────────────────────────────────── */

interface ProxyListOptions {
  limit?: number;
  offset?: number;
  status?: string;
  search?: string;
}

export async function getAllProxies({
  limit = 50,
  offset = 0,
  status,
  search,
}: ProxyListOptions = {}) {
  const conditions = [];
  if (status) {
    conditions.push(eq(proxies.status, status as "pending" | "building" | "live" | "paused" | "failed"));
  }
  if (search) {
    conditions.push(ilike(proxies.xHandle, `%${search}%`));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select()
    .from(proxies)
    .where(where)
    .orderBy(desc(proxies.createdAt))
    .limit(limit)
    .offset(offset);

  const [total] = await db
    .select({ count: sql<number>`count(*)` })
    .from(proxies)
    .where(where);

  return { rows, total: Number(total?.count ?? 0) };
}

/* ─────────────────────────────────────────────────────────── */
/*  Users (paginated, searchable)                              */
/* ─────────────────────────────────────────────────────────── */

interface UserListOptions {
  limit?: number;
  offset?: number;
  search?: string;
}

export async function getAllUsers({
  limit = 50,
  offset = 0,
  search,
}: UserListOptions = {}) {
  const where = search ? ilike(users.xHandle, `%${search}%`) : undefined;

  const rows = await db
    .select({
      id: users.id,
      privyId: users.privyId,
      xHandle: users.xHandle,
      displayName: users.displayName,
      walletAddress: users.walletAddress,
      points: users.points,
      tier: users.tier,
      createdAt: users.createdAt,
      proxyHandle: proxies.xHandle,
    })
    .from(users)
    .leftJoin(proxies, eq(proxies.creatorId, users.id))
    .where(where)
    .orderBy(desc(users.createdAt))
    .limit(limit)
    .offset(offset);

  const [total] = await db
    .select({ count: sql<number>`count(*)` })
    .from(users)
    .where(where);

  return { rows, total: Number(total?.count ?? 0) };
}

/* ─────────────────────────────────────────────────────────── */
/*  Ingestion logs (paginated, filterable)                     */
/* ─────────────────────────────────────────────────────────── */

interface IngestionLogOptions {
  limit?: number;
  offset?: number;
  proxyId?: string;
  status?: string;
}

export async function getIngestionLogs({
  limit = 50,
  offset = 0,
  proxyId,
  status,
}: IngestionLogOptions = {}) {
  const conditions = [];
  if (proxyId) conditions.push(eq(ingestionLogs.proxyId, proxyId));
  if (status) conditions.push(eq(ingestionLogs.status, status));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select({
      id: ingestionLogs.id,
      proxyId: ingestionLogs.proxyId,
      proxyHandle: proxies.xHandle,
      step: ingestionLogs.step,
      status: ingestionLogs.status,
      detail: ingestionLogs.detail,
      startedAt: ingestionLogs.startedAt,
      finishedAt: ingestionLogs.finishedAt,
    })
    .from(ingestionLogs)
    .leftJoin(proxies, eq(proxies.id, ingestionLogs.proxyId))
    .where(where)
    .orderBy(desc(ingestionLogs.startedAt))
    .limit(limit)
    .offset(offset);

  const [total] = await db
    .select({ count: sql<number>`count(*)` })
    .from(ingestionLogs)
    .where(where);

  return { rows, total: Number(total?.count ?? 0) };
}

/* ─────────────────────────────────────────────────────────── */
/*  Queue items (paginated, filterable)                        */
/* ─────────────────────────────────────────────────────────── */

interface QueueListOptions {
  limit?: number;
  offset?: number;
  status?: string;
}

export async function getAllQueueItems({
  limit = 50,
  offset = 0,
  status,
}: QueueListOptions = {}) {
  const where = status
    ? eq(queue.status, status as "pending" | "answered" | "skipped")
    : undefined;

  const rows = await db
    .select({
      id: queue.id,
      proxyId: queue.proxyId,
      proxyHandle: proxies.xHandle,
      question: queue.question,
      answer: queue.answer,
      status: queue.status,
      createdAt: queue.createdAt,
      answeredAt: queue.answeredAt,
    })
    .from(queue)
    .leftJoin(proxies, eq(proxies.id, queue.proxyId))
    .where(where)
    .orderBy(desc(queue.createdAt))
    .limit(limit)
    .offset(offset);

  const [total] = await db
    .select({ count: sql<number>`count(*)` })
    .from(queue)
    .where(where);

  return { rows, total: Number(total?.count ?? 0) };
}

/* ─────────────────────────────────────────────────────────── */
/*  Tokens (paginated)                                         */
/* ─────────────────────────────────────────────────────────── */

interface TokenListOptions {
  limit?: number;
  offset?: number;
}

export async function getAllTokens({
  limit = 50,
  offset = 0,
}: TokenListOptions = {}) {
  const rows = await db
    .select({
      id: proxyTokens.id,
      proxyId: proxyTokens.proxyId,
      proxyHandle: proxies.xHandle,
      tokenAddress: proxyTokens.tokenAddress,
      chain: proxyTokens.chain,
      deployedAt: proxyTokens.deployedAt,
      metadata: proxyTokens.metadata,
      marketCap: proxies.marketCap,
      volume24h: proxies.volume24h,
      price: proxies.price,
    })
    .from(proxyTokens)
    .leftJoin(proxies, eq(proxies.id, proxyTokens.proxyId))
    .orderBy(desc(proxyTokens.deployedAt))
    .limit(limit)
    .offset(offset);

  const [total] = await db
    .select({ count: sql<number>`count(*)` })
    .from(proxyTokens);

  return { rows, total: Number(total?.count ?? 0) };
}

/* ─────────────────────────────────────────────────────────── */
/*  Recent items for overview                                  */
/* ─────────────────────────────────────────────────────────── */

export async function getRecentIngestionLogs(limit = 10) {
  return db
    .select({
      id: ingestionLogs.id,
      proxyHandle: proxies.xHandle,
      step: ingestionLogs.step,
      status: ingestionLogs.status,
      startedAt: ingestionLogs.startedAt,
      finishedAt: ingestionLogs.finishedAt,
    })
    .from(ingestionLogs)
    .leftJoin(proxies, eq(proxies.id, ingestionLogs.proxyId))
    .orderBy(desc(ingestionLogs.startedAt))
    .limit(limit);
}

export async function getRecentProxies(limit = 5) {
  return db
    .select()
    .from(proxies)
    .orderBy(desc(proxies.createdAt))
    .limit(limit);
}
