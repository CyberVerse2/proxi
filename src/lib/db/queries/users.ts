import { desc, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { leaderboard, pointEvents, users } from '@/lib/db/schema';
import type { NewUser } from '@/lib/db/schema';

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
