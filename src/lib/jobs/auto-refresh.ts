/**
 * Auto-refresh job: periodically re-ingests recent posts for live proxies.
 * Would run as a Trigger.dev cron task in production.
 */

import { db } from "@/lib/db";
import { proxies } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getUserByUsername, getAllUserTweets } from "@/lib/x/client";
import { filterTrash } from "@/lib/x/filter";
import { selectTopPosts } from "@/lib/x/scorer";
import { embedAndStoreChunks } from "@/lib/ai/embeddings";

export async function autoRefreshProxy(proxyId: string, xHandle: string) {
  // Only pull recent tweets (last ~200)
  const user = await getUserByUsername(xHandle);
  if (!user) return;

  const recentTweets = await getAllUserTweets(user.id, 200);
  const filtered = filterTrash(recentTweets);
  const top = selectTopPosts(filtered, 100);

  const chunks = top.map((sp) => ({
    text: sp.tweet.text,
    contentType: sp.contentType,
    tweetId: sp.tweet.id,
    priority: Math.round(sp.score),
    qualityScore: sp.score,
  }));

  await embedAndStoreChunks(proxyId, chunks);
}

export async function refreshAllLiveProxies() {
  const liveProxies = await db.select().from(proxies).where(eq(proxies.status, "live"));

  for (const proxy of liveProxies) {
    try {
      await autoRefreshProxy(proxy.id, proxy.xHandle);
    } catch (err) {
      console.error(`Failed to refresh proxy ${proxy.xHandle}:`, err);
    }
  }
}
