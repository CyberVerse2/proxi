/**
 * Clone a user by X handle — full pipeline test.
 *
 * Runs the same flow as a "@proxiagent clone me" tweet:
 *   1. Look up X user
 *   2. Create Privy user with embedded wallet (server-side)
 *   3. Create DB user + proxy records
 *   4. Trigger ingest-proxy task (ingestion + token deployment + auto-categorization)
 *
 * Usage:
 *   npm run clone <username> [maxTweets]
 *
 * Options:
 *   --skip-privy           Skip Privy wallet creation (use a dummy wallet)
 *   --skip-token           Skip token deployment in the ingest task
 *   --mock                 Use mock tweets instead of calling X API (free, runs locally)
 *   --category=<slug>      Manually set proxy category (skips AI auto-classification)
 *                          Valid slugs: top-creators, founders, influencers, traders,
 *                          investors, ui-ux-design, athletes, solana, musicians
 *
 * Examples:
 *   npm run clone elonmusk
 *   npm run clone elonmusk 50
 *   npm run clone elonmusk --skip-privy
 *   npm run clone elonmusk --category=founders
 *   npm run clone testuser --mock --skip-privy    # Free: no X API, no Privy
 */

import dotenv from "dotenv";
dotenv.config();

import postgres from "postgres";
import { getUserByUsername } from "../src/lib/x/client";
import { Inngest } from "inngest";
import { PrivyClient } from "@privy-io/server-auth";
import { readFileSync } from "fs";
import { join } from "path";

const args = process.argv.slice(2);
const flags = args.filter((a) => a.startsWith("--"));
const positional = args.filter((a) => !a.startsWith("--"));

const handle = positional[0];
if (!handle) {
  console.error(
    "Usage: npm run clone <username> [maxTweets] [--skip-privy] [--skip-token] [--mock] [--category=<slug>]"
  );
  process.exit(1);
}

const maxTweets = positional[1] ? parseInt(positional[1], 10) : undefined;
const skipPrivy = flags.includes("--skip-privy");
const skipToken = flags.includes("--skip-token");
const useMock = flags.includes("--mock");
const categoryFlag = flags.find((f) => f.startsWith("--category="))?.split("=")[1];

const VALID_CATEGORIES = [
  "top-creators", "founders", "influencers", "traders", "investors",
  "ui-ux-design", "athletes", "solana", "musicians",
];

if (categoryFlag && !VALID_CATEGORIES.includes(categoryFlag)) {
  console.error(
    `❌ Invalid category "${categoryFlag}". Valid options:\n   ${VALID_CATEGORIES.join(", ")}`
  );
  process.exit(1);
}

async function main() {
  const cleanHandle = handle.replace(/^@/, "");

  // In mock mode, use a fake X user profile
  let xUser: { id: string; name: string; username: string; profile_image_url?: string | null; description?: string | null; public_metrics?: { followers_count: number } };

  if (useMock) {
    console.log(`\n🧪 Mock mode — skipping X API lookup`);
    xUser = {
      id: "0",
      name: cleanHandle,
      username: cleanHandle,
      description: `Mock profile for @${cleanHandle}`,
    };
  } else {
    console.log(`\n🔍 Looking up @${cleanHandle} on X...`);
    const result = await getUserByUsername(cleanHandle);
    if (!result) {
      console.error(`❌ User @${cleanHandle} not found on X`);
      process.exit(1);
    }
    xUser = result;
    console.log(
      `✅ Found: ${xUser.name} (@${xUser.username}) — ${xUser.public_metrics?.followers_count?.toLocaleString()} followers`
    );
  }

  // ── Step 1: Privy wallet creation ──────────────────────────
  let walletAddress: string | undefined;
  let privyId: string | undefined;

  if (skipPrivy) {
    console.log(`⏭️  Skipping Privy wallet creation (--skip-privy)`);
  } else {
    console.log(`\n🔐 Creating Privy user with embedded wallet...`);

    const privyAppId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
    const privySecret = process.env.PRIVY_APP_SECRET;

    if (!privyAppId || !privySecret) {
      console.error(
        `❌ NEXT_PUBLIC_PRIVY_APP_ID and PRIVY_APP_SECRET must be set in .env`
      );
      console.log(`   Tip: use --skip-privy to skip this step`);
      process.exit(1);
    }

    const privy = new PrivyClient(privyAppId, privySecret);

    try {
      // Try importing a new user
      const user = await privy.importUser({
        linkedAccounts: [
          {
            type: "twitter_oauth",
            subject: xUser.id,
            username: cleanHandle,
            name: xUser.name,
          },
        ],
        createEthereumWallet: true,
      });

      privyId = user.id;
      const wallet = user.linkedAccounts.find(
        (a) => a.type === "wallet" && a.chainType === "ethereum"
      );
      walletAddress =
        wallet && "address" in wallet ? wallet.address : undefined;

      console.log(`✅ Privy user created: ${privyId}`);
      console.log(`   Wallet: ${walletAddress ?? "none"}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);

      // User might already exist — try looking them up
      if (
        msg.includes("already linked") ||
        msg.includes("already exists") ||
        msg.includes("conflict")
      ) {
        console.log(
          `⚡ Twitter @${cleanHandle} already linked to a Privy user, looking up...`
        );
        try {
          const existing =
            await privy.getUserByTwitterUsername(cleanHandle);
          if (existing) {
            privyId = existing.id;
            const wallet = existing.linkedAccounts.find(
              (a) => a.type === "wallet" && a.chainType === "ethereum"
            );
            walletAddress =
              wallet && "address" in wallet ? wallet.address : undefined;
            console.log(`✅ Found existing Privy user: ${privyId}`);
            console.log(`   Wallet: ${walletAddress ?? "none"}`);
          }
        } catch (lookupErr) {
          console.error(
            `⚠️  Privy lookup failed:`,
            lookupErr instanceof Error ? lookupErr.message : lookupErr
          );
        }
      } else {
        console.error(`⚠️  Privy import failed: ${msg}`);
        console.log(`   Continuing without wallet...`);
      }
    }
  }

  // ── Step 2: DB records ─────────────────────────────────────
  console.log(`\n📝 Creating DB records...`);
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

  // Upsert user if we have a privyId
  let userId: string | undefined;
  if (privyId) {
    const [existingUser] = await sql`
      SELECT id FROM users WHERE privy_id = ${privyId}
    `;
    if (existingUser) {
      userId = existingUser.id;
      await sql`
        UPDATE users SET
          wallet_address = ${walletAddress ?? null},
          x_handle = ${cleanHandle},
          display_name = ${xUser.name},
          x_profile_image_url = ${xUser.profile_image_url?.replace("_normal", "_400x400") ?? null},
          bio = ${xUser.description ?? null},
          updated_at = now()
        WHERE id = ${userId!}
      `;
      console.log(`♻️  Updated existing user ${userId}`);
    } else {
      const [row] = await sql`
        INSERT INTO users (privy_id, wallet_address, x_handle, display_name, x_profile_image_url, bio)
        VALUES (${privyId}, ${walletAddress ?? null}, ${cleanHandle}, ${xUser.name},
                ${xUser.profile_image_url?.replace("_normal", "_400x400") ?? null},
                ${xUser.description ?? null})
        RETURNING id
      `;
      userId = row.id;
      console.log(`✅ Created user ${userId}`);
    }
  }

  // Upsert proxy
  const [existing] = await sql`
    SELECT id, status, token_address FROM proxies WHERE x_handle = ${cleanHandle}
  `;
  let proxyId: string;

  if (existing) {
    proxyId = existing.id;
    await sql`
      UPDATE proxies SET
        status = 'building',
        creator_id = ${userId ?? null},
        display_name = ${xUser.name},
        avatar_url = ${xUser.profile_image_url?.replace("_normal", "_400x400") ?? null},
        bio = ${xUser.description ?? null}
      WHERE id = ${proxyId}
    `;
    console.log(
      `♻️  Reusing existing proxy ${proxyId} (was: ${existing.status})${existing.token_address ? ` — token already deployed` : ""}`
    );
  } else {
    const [row] = await sql`
      INSERT INTO proxies (x_handle, creator_id, display_name, avatar_url, bio, status)
      VALUES (${cleanHandle}, ${userId ?? null}, ${xUser.name},
              ${xUser.profile_image_url?.replace("_normal", "_400x400") ?? null},
              ${xUser.description ?? null}, 'building')
      RETURNING id
    `;
    proxyId = row.id;
    console.log(`✅ Created proxy ${proxyId}`);
  }

  // ── Step 2b: Set category (if manually specified) ─────────
  if (categoryFlag) {
    const [cat] = await sql`
      SELECT id, name FROM categories WHERE slug = ${categoryFlag}
    `;
    if (cat) {
      await sql`UPDATE proxies SET category_id = ${cat.id} WHERE id = ${proxyId}`;
      console.log(`🏷️  Category set: ${cat.name}`);
    } else {
      console.log(`⚠️  Category "${categoryFlag}" not found in DB. Run: npm run db:seed`);
    }
  }

  // ── Step 3: Trigger ingestion + token deployment ──────────
  if (useMock) {
    // Run ingestion directly (no Trigger.dev needed) with mock tweets
    console.log(`\n🧪 Running ingestion locally with mock tweets...`);
    const mockPath = join(__dirname, "mock-tweets.json");
    const mockTweets = JSON.parse(readFileSync(mockPath, "utf-8"));
    console.log(`   Loaded ${mockTweets.length} mock tweets from scripts/mock-tweets.json`);

    const { runFullIngestion } = await import("../src/lib/x/ingest");
    const result = await runFullIngestion(
      proxyId,
      cleanHandle,
      (step, detail) => console.log(`   [${step}] ${detail}`),
      maxTweets,
      mockTweets,
    );

    console.log(`\n✅ Ingestion complete!`);
    console.log(`   Tweets processed: ${result.tweetsCollected}`);
    console.log(`   Top posts:        ${result.topSelected}`);
    console.log(`   Chunks stored:    ${result.chunksStored}`);
  } else {
    console.log(`\n🚀 Triggering ingest-proxy via Inngest...`);

    if (!walletAddress) {
      console.error(`\n❌ Wallet address is required for token deployment. Use --wallet <address>.`);
      process.exit(1);
    }

    const inngest = new Inngest({ id: "proxi" });

    const payload: {
      proxyId: string;
      xHandle: string;
      maxTweets?: number;
      walletAddress: string;
    } = {
      proxyId,
      xHandle: cleanHandle,
      walletAddress,
    };
    if (maxTweets) payload.maxTweets = maxTweets;
    console.log(`   Token deployment enabled (wallet: ${walletAddress})`);

    if (!process.env.INNGEST_EVENT_KEY && process.env.NODE_ENV !== "production") {
      console.log("   ⚠️  No INNGEST_EVENT_KEY in dev — run `npx inngest dev` so events are received locally.");
    }

    await inngest.send({
      name: "proxy/ingest.requested",
      data: payload,
    });

    console.log(`\n✅ Ingestion event sent!`);
    console.log(
      `\nThe function is running in the background. Check the Inngest dashboard for progress.`
    );
  }

  // ── Summary ────────────────────────────────────────────────
  console.log(`\n📋 Summary:`);
  console.log(`   X User:    @${cleanHandle} (${xUser.name})`);
  console.log(`   Privy ID:  ${privyId ?? "none"}`);
  console.log(`   Wallet:    ${walletAddress ?? "none"}`);
  console.log(`   User ID:   ${userId ?? "none"}`);
  console.log(`   Proxy ID:  ${proxyId}`);
  console.log(`   Category:  ${categoryFlag ?? "auto (assigned during ingestion)"}`);

  await sql.end();
}

main().catch((err) => {
  console.error("💥 Failed:", err.message);
  process.exit(1);
});
