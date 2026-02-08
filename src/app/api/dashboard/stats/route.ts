import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserByPrivyId, getProxyByCreatorId } from '@/lib/db/queries';
import { conversations, watchlist } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const privyId = searchParams.get('privyId');
  if (!privyId) return NextResponse.json({ error: 'Missing privyId' }, { status: 400 });

  const user = await getUserByPrivyId(privyId);
  if (!user)
    return NextResponse.json({ totalChats: 0, totalMessages: 0, uniqueUsers: 0, watchlisters: 0 });

  const proxy = await getProxyByCreatorId(user.id);
  if (!proxy)
    return NextResponse.json({ totalChats: 0, totalMessages: 0, uniqueUsers: 0, watchlisters: 0 });

  const [chatStats] = await db
    .select({
      totalChats: sql<number>`count(*)`,
      uniqueUsers: sql<number>`count(distinct ${conversations.userId})`,
      totalMessages: sql<number>`coalesce(sum(${conversations.totalMessages}), 0)`
    })
    .from(conversations)
    .where(eq(conversations.proxyId, proxy.id));

  const [wl] = await db
    .select({ count: sql<number>`count(*)` })
    .from(watchlist)
    .where(eq(watchlist.proxyId, proxy.id));

  return NextResponse.json({
    totalChats: Number(chatStats?.totalChats ?? 0),
    totalMessages: Number(chatStats?.totalMessages ?? 0),
    uniqueUsers: Number(chatStats?.uniqueUsers ?? 0),
    watchlisters: Number(wl?.count ?? 0)
  });
}
