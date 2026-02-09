/**
 * Trigger.dev scheduled task: poll-mentions
 *
 * Polls the X API every 2 minutes for new @proxifun mentions,
 * detects "create proxy" intents, and triggers the ingestion pipeline.
 */

import { schedules, logger } from "@trigger.dev/sdk";
import { getBotMentions } from "@/lib/x/client";
import { parseCreateIntent, handleCreateMention } from "@/lib/x/bot";
import { getProxyByHandle, getBotState, setBotState } from "@/lib/db/queries";

const STATE_KEY = "poll_mentions_since_id";

export const pollMentions = schedules.task({
  id: "poll-mentions",
  cron: "*/5 * * * *", // Every 5 minutes
  machine: "micro",
  maxDuration: 120, // 2 minutes max

  // Only one poll instance at a time
  queue: {
    concurrencyLimit: 1,
  },

  run: async () => {
    const botUserId = process.env.X_BOT_USER_ID;
    if (!botUserId) {
      logger.error("X_BOT_USER_ID env var is not set — skipping poll");
      return { skipped: true, reason: "missing X_BOT_USER_ID" };
    }

    // 1. Read the last processed tweet ID from the database
    const sinceId = await getBotState(STATE_KEY);
    logger.info("Polling for mentions", { sinceId: sinceId ?? "none (first run)" });

    // 2. Fetch new mentions from X
    const { mentions, newestId } = await getBotMentions(
      botUserId,
      sinceId ?? undefined,
    );

    if (mentions.length === 0) {
      logger.info("No new mentions found");
      return { processed: 0 };
    }

    logger.info(`Found ${mentions.length} new mention(s)`, {
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
        logger.debug("Skipping non-create mention", {
          tweetId: mention.id,
          text: mention.text.slice(0, 80),
        });
        skipped++;
        continue;
      }

      const authorHandle = mention.author_username;
      if (!authorHandle) {
        logger.warn("Mention has create intent but no author username", {
          tweetId: mention.id,
        });
        skipped++;
        continue;
      }

      // Check if a proxy already exists for this handle
      const existing = await getProxyByHandle(authorHandle);
      if (existing) {
        logger.info(`Proxy already exists for @${authorHandle}, skipping`, {
          proxyId: existing.id,
          status: existing.status,
        });
        skipped++;
        continue;
      }

      // Trigger the create flow
      logger.info(`Processing create intent from @${authorHandle}`, {
        tweetId: mention.id,
      });

      try {
        await handleCreateMention(authorHandle, mention.id);
        processed++;
      } catch (error) {
        logger.error(`Failed to handle mention from @${authorHandle}`, {
          tweetId: mention.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // 4. Save the newest tweet ID as cursor for next poll
    if (newestId) {
      await setBotState(STATE_KEY, newestId);
      logger.info("Updated poll cursor", { newestId });
    }

    return { processed, skipped, total: mentions.length };
  },
});
