import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { proxies, ratings, users } from '@/lib/db/schema';

/* ---------- ratings / reviews ---------- */
export async function rateProxy(proxyId: string, userId: string, score: number) {
  await db.insert(ratings).values({ proxyId, userId, score });
  await recalcProxyRating(proxyId);
}

export async function submitReview(
  proxyId: string,
  userId: string,
  score: number,
  reviewText?: string
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
      userAvatar: users.xProfileImageUrl
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
