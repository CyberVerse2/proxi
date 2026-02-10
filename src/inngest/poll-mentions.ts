/**
 * Inngest cron function: poll-mentions
 *
 * Polls the X API every 5 minutes for new @proxiagent mentions,
 * detects "create proxy" intents, and triggers the ingestion pipeline.
 */

import { inngest } from "./client";
import { getBotMentions } from "@/lib/x/client";
import { parseCreateIntent, handleCreateMention } from "@/lib/x/bot";
import { getProxyByHandle, getBotState, setBotState } from "@/lib/db/queries";

const STATE_KEY = "poll_mentions_since_id";

export const pollMentions = inngest.createFunction(
  {
    id: "poll-mentions",
    concurrency: [{ limit: 1 }],
    retries: 3,
  },
  { cron: "*/5 * * * *" },
  async () => {
    const botUserId = process.env.X_BOT_USER_ID;
    if (!botUserId) {
      console.error("[poll] X_BOT_USER_ID env var is not set — skipping poll");
      return { skipped: true, reason: "missing X_BOT_USER_ID" };
    }

    // 1. Read the last processed tweet ID from the database
    const sinceId = await getBotState(STATE_KEY);
    console.log("[poll] Polling for mentions", { sinceId: sinceId ?? "none (first run)" });

    // 2. Fetch new mentions from X
    const { mentions, newestId } = await getBotMentions(
      botUserId,
      sinceId ?? undefined,
    );

    if (mentions.length === 0) {
      console.log("[poll] No new mentions found");
      return { processed: 0 };
    }

    console.log(`[poll] Found ${mentions.length} new mention(s)`, {
      newestId,
      count: mentions.length,
    });

    // 3. Process mentions oldest-first (reverse since API returns newest-first)
    const reversed = [...mentions].reverse();
    let processed = 0;
    let skipped = 0;

    for (const mention of reversed) {
      // Check if this is a create intent
      const intent = parseCreateIntent(mention);
      if (!intent) {
        skipped++;
        continue;
      }

      const authorHandle = mention.author_username;
      if (!authorHandle) {
        console.warn("[poll] Mention has create intent but no author username", {
          tweetId: mention.id,
        });
        skipped++;
        continue;
      }

      // Check if a proxy already exists for this handle
      const existing = await getProxyByHandle(authorHandle);
      if (existing) {
        console.log(`[poll] Proxy already exists for @${authorHandle}, skipping`);
        skipped++;
        continue;
      }

      // Trigger the create flow
      console.log(`[poll] Processing create intent from @${authorHandle}`);

      try {
        await handleCreateMention(authorHandle, mention.id);
        processed++;
      } catch (error) {
        console.error(`[poll] Failed to handle mention from @${authorHandle}`, {
          tweetId: mention.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // 4. Save the newest tweet ID as cursor for next poll
    if (newestId) {
      await setBotState(STATE_KEY, newestId);
      console.log("[poll] Updated poll cursor", { newestId });
    }

    return { processed, skipped, total: mentions.length };
  },
);
