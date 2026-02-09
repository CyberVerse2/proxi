import { NextResponse } from "next/server";
import { getProxyByHandle } from "@/lib/db/queries";
import { db } from "@/lib/db";
import { contentChunks } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const handle = searchParams.get("handle");

  if (!handle) {
    return NextResponse.json({ error: "Missing handle" }, { status: 400 });
  }

  const proxy = await getProxyByHandle(handle);
  if (!proxy) {
    return NextResponse.json({ error: "Proxy not found" }, { status: 404 });
  }

  // Count ingested content chunks for this proxy
  let postsAnalyzed = 0;
  try {
    const [row] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(contentChunks)
      .where(eq(contentChunks.proxyId, proxy.id));
    postsAnalyzed = row?.count ?? 0;
  } catch {
    // non-critical
  }

  return NextResponse.json({
    id: proxy.id,
    xHandle: proxy.xHandle,
    displayName: proxy.displayName,
    avatarUrl: proxy.avatarUrl,
    bio: proxy.bio,
    creatorId: proxy.creatorId,
    ticker: proxy.ticker,
    chatPrice: proxy.chatPrice,
    tokenAddress: proxy.tokenAddress,
    status: proxy.status,
    totalChats: proxy.totalChats,
    totalMessages: proxy.totalMessages,
    marketCap: proxy.marketCap,
    price: proxy.price,
    voiceProfile: proxy.voiceProfile,
    coreBrain: proxy.coreBrain,
    postsAnalyzed,
    createdAt: proxy.createdAt,
  });
}
