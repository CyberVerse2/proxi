/**
 * Analyze each proxy's brain and assign them to a category.
 *
 * Uses the same AI classifier as ingestion: bio + topics from core_brain
 * (topicMap, opinions) to pick one of: top-creators, founders, influencers,
 * traders, investors, ui-ux-design, athletes, solana, musicians.
 *
 * Usage:
 *   npx tsx scripts/assign-proxy-categories.ts
 *   npx tsx scripts/assign-proxy-categories.ts --dry-run
 *   npx tsx scripts/assign-proxy-categories.ts --status=live
 *
 * Options:
 *   --dry-run       Log what would be assigned without updating the DB
 *   --status=<s>    Only process proxies with this status (default: all). e.g. --status=live
 *   --delay=<ms>    Delay between each proxy to avoid rate limits (default: 500)
 */

import dotenv from "dotenv";
dotenv.config();

import { db } from "../src/lib/db";
import { proxies } from "../src/lib/db/schema";
import { isNotNull, eq, and } from "drizzle-orm";
import { classifyProxy } from "../src/lib/ai/classifier";
import { getAllCategories, updateProxy } from "../src/lib/db/queries";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const statusFlag = args.find((a) => a.startsWith("--status="))?.split("=")[1];
const delayMs = Math.max(0, parseInt(args.find((a) => a.startsWith("--delay="))?.split("=")[1] ?? "500", 10));

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function extractTopicsFromBrain(coreBrain: unknown): string[] {
  if (!coreBrain || typeof coreBrain !== "object") return [];
  const brain = coreBrain as Record<string, unknown>;
  const topics: string[] = [];

  const topicMap = brain.topicMap as Record<string, string[]> | undefined;
  if (topicMap && typeof topicMap === "object") {
    topics.push(...Object.keys(topicMap));
  }

  const opinions = brain.opinions as Record<string, string> | undefined;
  if (opinions && typeof opinions === "object") {
    topics.push(...Object.keys(opinions));
  }

  const beliefs = brain.beliefs as string[] | undefined;
  if (Array.isArray(beliefs)) {
    topics.push(...beliefs.slice(0, 10));
  }

  return [...new Set(topics)].filter(Boolean).slice(0, 30);
}

async function main() {
  const conditions = [isNotNull(proxies.coreBrain)];
  if (statusFlag) conditions.push(eq(proxies.status, statusFlag as "pending" | "building" | "live" | "paused" | "failed"));

  const list = await db
    .select({
      id: proxies.id,
      xHandle: proxies.xHandle,
      displayName: proxies.displayName,
      bio: proxies.bio,
      categoryId: proxies.categoryId,
      coreBrain: proxies.coreBrain,
    })
    .from(proxies)
    .where(and(...conditions));

  if (list.length === 0) {
    console.log("No proxies with a brain found.");
    return;
  }

  console.log(`\n📂 Found ${list.length} proxy(ies) with brain data. ${dryRun ? "(dry run — no DB updates)" : ""}\n`);

  const categories = await getAllCategories();
  const slugToId = new Map(categories.map((c) => [c.slug, c.id]));

  for (let i = 0; i < list.length; i++) {
    const proxy = list[i];
    const topics = extractTopicsFromBrain(proxy.coreBrain);
    const bio = proxy.bio ?? null;

    try {
      const result = await classifyProxy({
        bio,
        followerCount: 0,
        topics,
      });

      const categoryId = slugToId.get(result.category) ?? null;
      const slug = result.category;

      console.log(`[${i + 1}/${list.length}] @${proxy.xHandle} → ${slug} (${(result.confidence * 100).toFixed(0)}%) — ${result.reasoning.slice(0, 80)}...`);

      if (!dryRun && categoryId) {
        await updateProxy(proxy.id, { categoryId });
      }
    } catch (err) {
      console.error(`[${i + 1}/${list.length}] @${proxy.xHandle} failed:`, err instanceof Error ? err.message : err);
    }
    if (i < list.length - 1 && delayMs > 0) await sleep(delayMs);
  }

  console.log("\n✅ Done.");
}

main().catch((err) => {
  console.error("💥", err.message);
  process.exit(1);
});
