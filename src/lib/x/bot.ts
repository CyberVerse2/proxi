/**
 * X Bot: Thin listener that detects @proxiagent mentions,
 * parses create intent, creates proxy record, sends initial reply,
 * and dispatches the Trigger.dev ingestion task.
 */

import { tasks } from "@trigger.dev/sdk";
import type { ingestProxy } from "@/trigger/ingest-proxy";
import { sendTweet, getUserByUsername, type XTweet } from "./client";
import { createProxy, getProxyByHandle, upsertUser } from "@/lib/db/queries";
import { createUserWithWallet } from "@/lib/auth/privy";

const BOT_HANDLE = process.env.BOT_HANDLE ?? "proxiagent";

interface MentionEvent {
  tweet: XTweet;
  mentionedHandle: string;
}

/**
 * Parse a mention tweet to determine if it's a create intent.
 * Looks for patterns like:
 * - "@proxiagent clone me"
 * - "@proxiagent create my proxy"
 * - "@proxiagent make my clone"
 */
export function parseCreateIntent(tweet: XTweet): MentionEvent | null {
  const text = tweet.text.toLowerCase();

  // Must mention the bot
  if (!text.includes(`@${BOT_HANDLE}`)) return null;

  // Check for create intent keywords
  const createPatterns = [
    /clone\s*(me|myself)/i,
    /create\s*(my\s*)?(proxy|clone)/i,
    /make\s*(my\s*)?(proxy|clone)/i,
    /build\s*(my\s*)?(proxy|clone)/i,
    /setup\s*(my\s*)?(proxy|clone)/i,
  ];

  const isCreateIntent = createPatterns.some((p) => p.test(text));
  if (!isCreateIntent) return null;

  // The user who tweeted is the one who wants the clone
  // Extract their handle from the tweet author (would come from webhook)
  return {
    tweet,
    mentionedHandle: "", // Will be populated from webhook data
  };
}

/**
 * Handle a confirmed create intent:
 * 1. Look up the X user
 * 2. Create Privy user with embedded wallet (server-side)
 * 3. Create DB user + proxy records
 * 4. Send initial reply
 * 5. Dispatch background task via Trigger.dev (with walletAddress)
 */
export async function handleCreateMention(
  authorHandle: string,
  tweetId: string,
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://proxi.fun";

  // Step 0: Check if a proxy already exists for this handle
  const existing = await getProxyByHandle(authorHandle);
  if (existing) {
    await sendTweet(
      `@${authorHandle} You already have a proxy! Check it out: ${appUrl}/${authorHandle}`,
      tweetId,
    );
    return;
  }

  // Step 1: Verify the user exists on X
  const xUser = await getUserByUsername(authorHandle);
  if (!xUser) {
    await sendTweet(
      `@${authorHandle} Couldn't find your X profile. Make sure your account is public and try again!`,
      tweetId,
    );
    return;
  }

  // Step 2: Create Privy user with embedded wallet (server-side)
  let walletAddress: string | undefined;
  let dbUserId: string | undefined;
  try {
    const privyResult = await createUserWithWallet(authorHandle, xUser.id);
    walletAddress = privyResult.walletAddress;

    // Step 3: Create / update DB user record
    const dbUser = await upsertUser({
      privyId: privyResult.privyId,
      walletAddress: privyResult.walletAddress,
      xHandle: authorHandle,
      displayName: xUser.name,
      xProfileImageUrl: xUser.profile_image_url?.replace("_normal", "_400x400"),
      bio: xUser.description,
    });
    dbUserId = dbUser.id;

    console.log(
      `[bot] Created Privy user + wallet for @${authorHandle}: ${walletAddress}`,
    );
  } catch (privyErr) {
    // Non-fatal: continue without wallet — token deployment will be skipped
    console.error(
      `[bot] Failed to create Privy wallet for @${authorHandle}:`,
      privyErr,
    );
  }

  // Step 4: Create proxy record (linked to user if we have one)
  const proxy = await createProxy({
    creatorId: dbUserId,
    xHandle: authorHandle,
    displayName: xUser.name,
    avatarUrl: xUser.profile_image_url?.replace("_normal", "_400x400"),
    bio: xUser.description,
    status: "building",
  });

  // Step 5: Send Reply 1 (acknowledgment)
  await sendTweet(
    `@${authorHandle} 🔥 Building your AI proxy now!\n\nI'm analyzing your top posts, learning your voice, and creating your digital twin. This usually takes 2-3 minutes.\n\nI'll reply here when it's ready. Stay tuned!`,
    tweetId,
  );

  // Step 6: Dispatch background task via Trigger.dev (with walletAddress)
  try {
    const handle = await tasks.trigger<typeof ingestProxy>("ingest-proxy", {
      proxyId: proxy.id,
      xHandle: authorHandle,
      tweetId,
      walletAddress,
    });

    console.log(
      `[bot] Triggered ingest-proxy task for @${authorHandle}: run ${handle.id}`,
    );
  } catch (error) {
    console.error(
      `[bot] Failed to trigger ingestion for @${authorHandle}:`,
      error,
    );
    await sendTweet(
      `@${authorHandle} Sorry, something went wrong while building your proxy. Our team has been notified. Please try again later!`,
      tweetId,
    );
  }
}

/**
 * Send the completion reply when the proxy is ready.
 * Called from the ingest-proxy task on success.
 *
 * If token info is provided, the reply includes the ticker and
 * a link to the claim page where the creator can access their wallet/fees.
 */
export async function sendCompletionReply(
  handle: string,
  proxyId: string,
  originalTweetId: string,
  tokenInfo?: { tokenAddress: string; ticker: string },
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://proxi.fun";

  const lines = [
    `@${handle} ✅ Your AI proxy is LIVE!`,
    ``,
    `🔗 Chat: ${appUrl}/${handle}`,
  ];

  if (tokenInfo) {
    lines.push(`💰 Token: $${tokenInfo.ticker}`);
    lines.push(`🎁 Claim your creator fees: ${appUrl}/${handle}/claim`);
  } else {
    lines.push(
      `People can now chat with your AI clone. Claim your proxy to customize it further.`,
    );
  }

  await sendTweet(lines.join("\n"), originalTweetId);
  void proxyId; // Used for linking in production
}
