/**
 * Trigger.dev task: ingest-proxy
 *
 * Wraps the full X data ingestion pipeline in a durable background task
 * with retry, progress logging, and concurrency control.
 */

import { task, logger } from "@trigger.dev/sdk";
import { runFullIngestion } from "@/lib/x/ingest";
import { sendCompletionReply } from "@/lib/x/bot";
import { sendTweet } from "@/lib/x/client";
import { db } from "@/lib/db";
import { ingestionLogs } from "@/lib/db/schema";

interface IngestProxyPayload {
  proxyId: string;
  xHandle: string;
  /** Original tweet ID so the task can reply with the completion message. */
  tweetId?: string;
  /** Max tweets to fetch. Defaults to 500. */
  maxTweets?: number;
}

export const ingestProxy = task({
  id: "ingest-proxy",

  // Retry up to 2 times with exponential backoff (X API can be flaky)
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 5_000,
    maxTimeoutInMs: 60_000,
  },

  // Ingestion can take a while for large accounts
  maxDuration: 600, // 10 minutes

  // Only run one ingestion at a time per environment to avoid rate limits
  queue: {
    concurrencyLimit: 2,
  },

  run: async (payload: IngestProxyPayload) => {
    const { proxyId, xHandle, tweetId, maxTweets } = payload;

    logger.info("Starting proxy ingestion", { proxyId, xHandle, maxTweets });

    const logStep = async (step: string, detail: string) => {
      logger.info(`[${step}] ${detail}`, { proxyId, step });
      await db.insert(ingestionLogs).values({
        proxyId,
        step,
        status: "in_progress",
        detail,
      });
    };

    try {
      const result = await runFullIngestion(
        proxyId,
        xHandle,
        async (step, detail) => {
          await logStep(step, detail);
        },
        maxTweets,
      );

      // Log success
      await db.insert(ingestionLogs).values({
        proxyId,
        step: "complete",
        status: "success",
        detail: JSON.stringify({
          tweetsCollected: result.tweetsCollected,
          afterFilter: result.afterFilter,
          topSelected: result.topSelected,
          chunksStored: result.chunksStored,
        }),
        finishedAt: new Date(),
      });

      logger.info("Proxy ingestion complete", {
        proxyId,
        xHandle,
        tweetsCollected: result.tweetsCollected,
        topSelected: result.topSelected,
      });

      // Send completion tweet as a reply to the original mention
      if (tweetId) {
        try {
          await sendCompletionReply(xHandle, proxyId, tweetId);
          logger.info("Completion tweet sent", { xHandle, tweetId });
        } catch (replyErr) {
          // Don't fail the whole task if the tweet fails
          logger.warn("Failed to send completion tweet", {
            error: replyErr instanceof Error ? replyErr.message : String(replyErr),
          });
        }
      }

      return result;
    } catch (error) {
      // Log failure
      await db.insert(ingestionLogs).values({
        proxyId,
        step: "error",
        status: "failed",
        detail: error instanceof Error ? error.message : "Unknown error",
        finishedAt: new Date(),
      });

      logger.error("Proxy ingestion failed", {
        proxyId,
        xHandle,
        error: error instanceof Error ? error.message : String(error),
      });

      // Notify the user on final failure (only if this is likely the last attempt)
      if (tweetId) {
        await sendTweet(
          `@${xHandle} Sorry, something went wrong while building your proxy. Our team has been notified. Please try again later!`,
          tweetId,
        ).catch(() => {}); // Swallow tweet errors on failure path
      }

      throw error; // Re-throw so Trigger.dev retries
    }
  },
});
