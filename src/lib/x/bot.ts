/**
 * X Bot: Thin listener that detects @proxifun mentions,
 * parses create intent, creates proxy record, sends initial reply,
 * and dispatches the Trigger.dev ingestion task.
 */

import { tasks } from "@trigger.dev/sdk";
import type { ingestProxy } from "@/trigger/ingest-proxy";
import { sendTweet, getUserByUsername, type XTweet } from "./client";
import { createProxy } from "@/lib/db/queries";

const BOT_HANDLE = "proxifun";

interface MentionEvent {
  tweet: XTweet;
  mentionedHandle: string;
}

/**
 * Parse a mention tweet to determine if it's a create intent.
 * Looks for patterns like:
 * - "@proxifun clone me"
 * - "@proxifun create my proxy"
 * - "@proxifun make my clone"
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
 * 2. Create a proxy record in pending state
 * 3. Send initial reply
 * 4. Dispatch background task via Trigger.dev
 */
export async function handleCreateMention(
  authorHandle: string,
  tweetId: string,
) {
  // Step 1: Verify the user exists on X
  const xUser = await getUserByUsername(authorHandle);
  if (!xUser) {
    await sendTweet(
      `@${authorHandle} Couldn't find your X profile. Make sure your account is public and try again!`,
      tweetId,
    );
    return;
  }

  // Step 2: Create proxy record
  const proxy = await createProxy({
    xHandle: authorHandle,
    displayName: xUser.name,
    avatarUrl: xUser.profile_image_url?.replace("_normal", "_400x400"),
    bio: xUser.description,
    status: "building",
  });

  // Step 3: Send Reply 1 (acknowledgment)
  await sendTweet(
    `@${authorHandle} 🔥 Building your AI proxy now!\n\nI'm analyzing your top posts, learning your voice, and creating your digital twin. This usually takes 2-3 minutes.\n\nI'll reply here when it's ready. Stay tuned!`,
    tweetId,
  );

  // Step 4: Dispatch background task via Trigger.dev
  // The task runs asynchronously — completion reply is handled inside the task
  try {
    const handle = await tasks.trigger<typeof ingestProxy>("ingest-proxy", {
      proxyId: proxy.id,
      xHandle: authorHandle,
      tweetId,
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
 */
export async function sendCompletionReply(
  handle: string,
  proxyId: string,
  originalTweetId: string,
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://proxi.fun";
  await sendTweet(
    `@${handle} ✅ Your AI proxy is LIVE!\n\n🔗 ${appUrl}/${handle}\n\nPeople can now chat with your AI clone. Claim your proxy to earn royalties and customize it further.`,
    originalTweetId,
  );
  void proxyId; // Used for linking in production
}
