/**
 * Launch proxies for multiple X/Twitter accounts.
 *
 * Same flow per handle as clone.ts: X lookup → Privy user + wallet → DB user + proxy → Inngest ingest.
 *
 * Usage:
 *   npx tsx scripts/launch-proxies.ts handle1 handle2 handle3
 *   npx tsx scripts/launch-proxies.ts --file=handles.txt
 *   npx tsx scripts/launch-proxies.ts --file=handles.txt --delay=10000
 *
 * Options:
 *   --file=<path>    Read handles from file (one handle per line, # and empty lines ignored)
 *   --delay=<ms>     Delay in ms between each account (default: 5000). Helps avoid rate limits.
 *   --skip-privy     Skip Privy wallet creation (proxy will be created but token deploy will fail without wallet)
 *   --category=<slug> Set category for all proxies (top-creators, founders, etc.)
 *   --max-tweets=<n> Max tweets to ingest per proxy (default: 500)
 *
 * Sending events to production Inngest:
 *   Set INNGEST_EVENT_KEY to your production event key (from app.inngest.com) when running
 *   the script. Events will then be sent to Inngest Cloud and run on your deployed app.
 *   Example: INNGEST_EVENT_KEY=your_prod_key npm run launch-proxies -- --file=handles.txt
 *
 * Examples:
 *   npx tsx scripts/launch-proxies.ts alice bob charlie
 *   npx tsx scripts/launch-proxies.ts --file=handles.txt --delay=10000
 *   npx tsx scripts/launch-proxies.ts --file=handles.txt --category=founders --max-tweets=300
 */

import dotenv from "dotenv";
dotenv.config();

import postgres from "postgres";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { getUserByUsername } from "../src/lib/x/client";
import { Inngest } from "inngest";
import { PrivyClient } from "@privy-io/server-auth";

const args = process.argv.slice(2);
const flags = args.filter((a) => a.startsWith("--"));
const positional = args.filter((a) => !a.startsWith("--"));

const filePath = flags.find((f) => f.startsWith("--file="))?.split("=")[1];
const delayMs = Math.max(0, parseInt(flags.find((f) => f.startsWith("--delay="))?.split("=")[1] ?? "5000", 10));
const skipPrivy = flags.includes("--skip-privy");
const categoryFlag = flags.find((f) => f.startsWith("--category="))?.split("=")[1];
const maxTweetsFlag = flags.find((f) => f.startsWith("--max-tweets="))?.split("=")[1];
const maxTweets = maxTweetsFlag ? parseInt(maxTweetsFlag, 10) : 500;

const VALID_CATEGORIES = [
  "top-creators", "founders", "influencers", "traders", "investors",
  "ui-ux-design", "athletes", "solana", "musicians",
];

if (categoryFlag && !VALID_CATEGORIES.includes(categoryFlag)) {
  console.error(`❌ Invalid category "${categoryFlag}". Valid: ${VALID_CATEGORIES.join(", ")}`);
  process.exit(1);
}

function getHandles(): string[] {
  if (filePath) {
    const path = join(process.cwd(), filePath);
    if (!existsSync(path)) {
      console.error(`❌ File not found: ${path}`);
      process.exit(1);
    }
    const content = readFileSync(path, "utf-8");
    return content
      .split(/\r?\n/)
      .map((line) => line.replace(/^@/, "").trim().split(/#/)[0].trim())
      .filter(Boolean);
  }
  if (positional.length === 0) {
    console.error("Usage: npx tsx scripts/launch-proxies.ts handle1 handle2 ... OR --file=handles.txt");
    process.exit(1);
  }
  return positional.map((h) => h.replace(/^@/, ""));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function launchOne(
  cleanHandle: string,
  sql: postgres.Sql,
  privy: PrivyClient | null,
  inngest: Inngest,
): Promise<{ ok: boolean; proxyId?: string; error?: string }> {
  let xUser: { id: string; name: string; username: string; profile_image_url?: string | null; description?: string | null };
  let walletAddress: string | undefined;
  let privyId: string | undefined;
  let userId: string | undefined;

  try {
    const result = await getUserByUsername(cleanHandle);
    if (!result) {
      return { ok: false, error: `User @${cleanHandle} not found on X` };
    }
    xUser = result;
  } catch (e) {
    return { ok: false, error: `X lookup failed: ${e instanceof Error ? e.message : String(e)}` };
  }

  if (privy && !skipPrivy) {
    try {
      const user = await privy.importUser({
        linkedAccounts: [
          { type: "twitter_oauth", subject: xUser.id, username: cleanHandle, name: xUser.name },
        ],
        createEthereumWallet: true,
      });
      privyId = user.id;
      const wallet = user.linkedAccounts.find((a) => a.type === "wallet" && a.chainType === "ethereum");
      walletAddress = wallet && "address" in wallet ? wallet.address : undefined;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("already linked") || msg.includes("already exists") || msg.includes("conflict")) {
        try {
          const existing = await privy.getUserByTwitterUsername(cleanHandle);
          if (existing) {
            privyId = existing.id;
            const wallet = existing.linkedAccounts.find((a) => a.type === "wallet" && a.chainType === "ethereum");
            walletAddress = wallet && "address" in wallet ? wallet.address : undefined;
          }
        } catch {
          // leave walletAddress undefined
        }
      }
    }
  }

  const avatar = xUser.profile_image_url?.replace("_normal", "_400x400") ?? null;
  const bio = xUser.description ?? null;

  if (privyId) {
    const pid: string = privyId;
    const wallet = walletAddress ?? null;

    const [existingUser] = await sql`SELECT id FROM users WHERE privy_id = ${pid}`;
    if (existingUser) {
      userId = existingUser.id;
      const uid: string = userId!;
      await sql`
        UPDATE users SET
          wallet_address = ${wallet},
          x_handle = ${cleanHandle},
          display_name = ${xUser.name},
          x_profile_image_url = ${avatar},
          bio = ${bio},
          updated_at = now()
        WHERE id = ${uid}
      `;
    } else {
      const [row] = await sql`
        INSERT INTO users (privy_id, wallet_address, x_handle, display_name, x_profile_image_url, bio)
        VALUES (${pid}, ${wallet}, ${cleanHandle}, ${xUser.name}, ${avatar}, ${bio})
        RETURNING id
      `;
      userId = row.id;
    }
  }

  const creatorId = userId ?? null;

  const [existing] = await sql`
    SELECT id, status, token_address FROM proxies WHERE x_handle = ${cleanHandle}
  `;
  let proxyId: string;

  if (existing) {
    proxyId = existing.id;
    await sql`
      UPDATE proxies SET
        status = 'building',
        creator_id = ${creatorId},
        display_name = ${xUser.name},
        avatar_url = ${avatar},
        bio = ${bio}
      WHERE id = ${proxyId}
    `;
  } else {
    const [row] = await sql`
      INSERT INTO proxies (x_handle, creator_id, display_name, avatar_url, bio, status)
      VALUES (${cleanHandle}, ${creatorId}, ${xUser.name}, ${avatar}, ${bio}, 'building')
      RETURNING id
    `;
    proxyId = row.id;
  }

  if (categoryFlag) {
    const [cat] = await sql`SELECT id FROM categories WHERE slug = ${categoryFlag}`;
    if (cat) await sql`UPDATE proxies SET category_id = ${cat.id} WHERE id = ${proxyId}`;
  }

  if (!walletAddress) {
    return { ok: false, proxyId, error: "No wallet (required for token deployment). Use without --skip-privy or ensure Privy env vars are set." };
  }

  if (!process.env.INNGEST_EVENT_KEY && process.env.NODE_ENV !== "production") {
    console.log("   ⚠️  No INNGEST_EVENT_KEY in dev — run `npx inngest dev` so events are received locally.");
  }

  await inngest.send({
    name: "proxy/ingest.requested",
    data: {
      proxyId,
      xHandle: cleanHandle,
      maxTweets: maxTweets || undefined,
      walletAddress,
    },
  });

  return { ok: true, proxyId };
}

async function main() {
  const handles = getHandles();
  console.log(`\n🚀 Launching proxies for ${handles.length} account(s): ${handles.map((h) => `@${h}`).join(", ")}\n`);

  const sql = postgres(process.env.DATABASE_URL!, { prepare: false });
  let privy: PrivyClient | null = null;
  if (!skipPrivy && process.env.NEXT_PUBLIC_PRIVY_APP_ID && process.env.PRIVY_APP_SECRET) {
    privy = new PrivyClient(process.env.NEXT_PUBLIC_PRIVY_APP_ID, process.env.PRIVY_APP_SECRET);
  } else if (!skipPrivy) {
    console.error("❌ Privy env vars not set. Use --skip-privy or set NEXT_PUBLIC_PRIVY_APP_ID and PRIVY_APP_SECRET.");
    process.exit(1);
  }

  const inngest = new Inngest({ id: "proxi" });
  const results: { handle: string; ok: boolean; proxyId?: string; error?: string }[] = [];

  for (let i = 0; i < handles.length; i++) {
    const handle = handles[i];
    console.log(`[${i + 1}/${handles.length}] @${handle} ...`);
    const r = await launchOne(handle, sql, privy, inngest);
    results.push({ handle, ...r });
    if (r.ok) {
      console.log(`   ✅ Proxy ${r.proxyId} — ingest triggered`);
    } else {
      console.log(`   ❌ ${r.error}`);
    }
    if (i < handles.length - 1 && delayMs > 0) {
      await sleep(delayMs);
    }
  }

  await sql.end();

  const ok = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);
  console.log(`\n📋 Done: ${ok}/${handles.length} launched.`);
  if (failed.length) {
    console.log("Failed:");
    failed.forEach((r) => console.log(`   @${r.handle}: ${r.error}`));
  }
}

main().catch((err) => {
  console.error("💥", err.message);
  process.exit(1);
});
