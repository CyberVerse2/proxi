/**
 * Clone a user by X handle.
 *
 * Usage:
 *   npx tsx scripts/clone.ts <username> [maxTweets]
 *
 * Examples:
 *   npx tsx scripts/clone.ts elonmusk
 *   npx tsx scripts/clone.ts elonmusk 50
 */

import dotenv from "dotenv";
dotenv.config();

import postgres from "postgres";
import { getUserByUsername } from "../src/lib/x/client";
import { tasks } from "@trigger.dev/sdk";
import type { ingestProxy } from "../src/trigger/ingest-proxy";

const handle = process.argv[2];
if (!handle) {
  console.error("Usage: npx tsx scripts/clone.ts <username> [maxTweets]");
  process.exit(1);
}

const maxTweets = process.argv[3] ? parseInt(process.argv[3], 10) : undefined;

async function main() {
  const cleanHandle = handle.replace(/^@/, "");

  console.log(`\n🔍 Looking up @${cleanHandle} on X...`);
  const xUser = await getUserByUsername(cleanHandle);
  if (!xUser) {
    console.error(`❌ User @${cleanHandle} not found on X`);
    process.exit(1);
  }
  console.log(`✅ Found: ${xUser.name} (@${xUser.username}) — ${xUser.public_metrics?.followers_count?.toLocaleString()} followers`);

  // Create proxy record directly via SQL
  console.log(`📝 Creating proxy record...`);
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

  const [existing] = await sql`SELECT id, status FROM proxies WHERE x_handle = ${cleanHandle}`;
  let proxyId: string;

  if (existing) {
    proxyId = existing.id;
    await sql`UPDATE proxies SET status = 'building', display_name = ${xUser.name}, avatar_url = ${xUser.profile_image_url?.replace("_normal", "_400x400") ?? null}, bio = ${xUser.description ?? null} WHERE id = ${proxyId}`;
    console.log(`♻️  Reusing existing proxy ${proxyId} (was: ${existing.status})`);
  } else {
    const [row] = await sql`INSERT INTO proxies (x_handle, display_name, avatar_url, bio, status) VALUES (${cleanHandle}, ${xUser.name}, ${xUser.profile_image_url?.replace("_normal", "_400x400") ?? null}, ${xUser.description ?? null}, 'building') RETURNING id`;
    proxyId = row.id;
    console.log(`✅ Created proxy ${proxyId}`);
  }

  // Trigger the ingestion task
  console.log(`🚀 Triggering ingest-proxy task...`);
  const payload: { proxyId: string; xHandle: string; maxTweets?: number } = {
    proxyId,
    xHandle: cleanHandle,
  };
  if (maxTweets) payload.maxTweets = maxTweets;

  const run = await tasks.trigger<typeof ingestProxy>("ingest-proxy", payload);

  console.log(`\n✅ Task triggered! Run ID: ${run.id}`);
  console.log(`📊 Dashboard: https://cloud.trigger.dev/projects/v3/proj_ebjluzuysonvaqmjjrgv/runs/${run.id}`);
  console.log(`\nThe task is running in the background. Check the dashboard for progress.`);

  await sql.end();
}

main().catch((err) => {
  console.error("💥 Failed:", err.message);
  process.exit(1);
});
