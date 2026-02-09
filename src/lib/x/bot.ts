/**
 * X Bot: Thin listener that detects @proxiagent mentions,
 * parses create intent, creates proxy record, sends initial reply,
 * and dispatches the Trigger.dev ingestion task.
 */

import { tasks } from "@trigger.dev/sdk";
import type { ingestProxy } from "@/trigger/ingest-proxy";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
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
 * Use AI to determine if a Twitter account is a company/brand/organization
 * rather than an individual person. Returns true if the account appears
 * to be a company.
 */
async function detectCompanyAccount(
  name: string,
  bio: string,
): Promise<boolean> {
  try {
    const { text } = await generateText({
      model: anthropic("claude-haiku-3"),
      maxOutputTokens: 10,
      prompt: `You are classifying a Twitter/X account as either an INDIVIDUAL person or a COMPANY/BRAND/ORGANIZATION.

Account name: ${name}
Account bio: ${bio}

Rules:
- If the account clearly belongs to a company, brand, organization, government agency, media outlet, or any non-individual entity, respond "COMPANY".
- If the account belongs to an individual person (even if they mention their employer, projects, or roles at companies), respond "INDIVIDUAL".
- Creators, founders, freelancers, and personal accounts are INDIVIDUAL even if they promote their own brand.
- When in doubt, respond "INDIVIDUAL".

Respond with exactly one word: COMPANY or INDIVIDUAL.`,
    });

    return text.trim().toUpperCase() === "COMPANY";
  } catch (err) {
    // If AI call fails, default to allowing the account through
    console.error("[bot] Company detection failed, allowing account:", err);
    return false;
  }
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

  // Step 1: Verify the user exists on X and meets minimum requirements
  const xUser = await getUserByUsername(authorHandle);
  if (!xUser) {
    await sendTweet(
      `@${authorHandle} Couldn't find your X profile. Make sure your account is public and try again!`,
      tweetId,
    );
    return;
  }

  // Step 1b: Reject company/brand accounts using AI analysis
  if (xUser.description) {
    const isCompany = await detectCompanyAccount(
      xUser.name,
      xUser.description,
    );
    if (isCompany) {
      await sendTweet(
        `@${authorHandle} Proxi is designed for individual creators, not company or brand accounts. If you're a person behind this account, update your bio and try again!`,
        tweetId,
      );
      return;
    }
  }

  const followers = xUser.public_metrics?.followers_count ?? 0;
  const tweets = xUser.public_metrics?.tweet_count ?? 0;

  if (followers < 200 || tweets < 200) {
    const reasons: string[] = [];
    if (followers < 200) reasons.push(`${followers}/200 followers`);
    if (tweets < 200) reasons.push(`${tweets}/200 posts`);
    await sendTweet(
      `@${authorHandle} Your account needs at least 200 followers and 200 posts to create a proxy. You currently have ${reasons.join(" and ")}. Keep posting and try again soon!`,
      tweetId,
    );
    return;
  }

  // Step 2: Create Privy user with embedded wallet (server-side)
  // This is required — without a wallet we can't deploy a token or collect fees
  let walletAddress: string;
  try {
    const privyResult = await createUserWithWallet(authorHandle, xUser.id);
    walletAddress = privyResult.walletAddress;

    // Step 3: Create / update DB user record (wallet ready for token deployment)
    await upsertUser({
      privyId: privyResult.privyId,
      walletAddress: privyResult.walletAddress,
      xHandle: authorHandle,
      displayName: xUser.name,
      xProfileImageUrl: xUser.profile_image_url?.replace("_normal", "_400x400"),
      bio: xUser.description,
    });

    console.log(
      `[bot] Created Privy user + wallet for @${authorHandle}: ${walletAddress}`,
    );
  } catch (privyErr) {
    console.error(
      `[bot] Failed to create Privy wallet for @${authorHandle}:`,
      privyErr,
    );
    await sendTweet(
      `@${authorHandle} Something went wrong setting up your account. Please try again in a few minutes!`,
      tweetId,
    );
    return;
  }

  // Step 4: Create proxy record (unclaimed — creatorId is set when user claims)
  const proxy = await createProxy({
    xHandle: authorHandle,
    displayName: xUser.name,
    avatarUrl: xUser.profile_image_url?.replace("_normal", "_400x400"),
    bio: xUser.description,
    status: "building",
  });

  // Step 5: Dispatch background task via Trigger.dev (with walletAddress)
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
