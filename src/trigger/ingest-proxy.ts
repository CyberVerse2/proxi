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
import { deployProxyToken } from "@/lib/chain/token";
import { getProxyById } from "@/lib/db/queries";

interface IngestProxyPayload {
  proxyId: string;
  xHandle: string;
  /** Original tweet ID so the task can reply with the completion message. */
  tweetId?: string;
  /** Max tweets to fetch. Defaults to 500. */
  maxTweets?: number;
  /** Creator's wallet address — used to deploy their token after ingestion. */
  walletAddress: string;
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

  run: async (payload: IngestProxyPayload, { ctx }) => {
    const { proxyId, xHandle, tweetId, maxTweets, walletAddress } = payload;

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

      // Deploy token — required for proxy to go live
      let tokenInfo: { tokenAddress: string; ticker: string } | undefined;
      const proxy = await getProxyById(proxyId);

      if (proxy?.tokenAddress) {
        // Already deployed (e.g. retry after partial success)
        logger.info("Token already deployed, skipping", {
          proxyId,
          tokenAddress: proxy.tokenAddress,
        });
        tokenInfo = {
          tokenAddress: proxy.tokenAddress,
          ticker: proxy.ticker ?? xHandle.toUpperCase().slice(0, 5),
        };
      } else {
        logger.info("Deploying token for proxy", { proxyId, walletAddress });
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://proxi.fun";
        const displayName = proxy?.displayName ?? xHandle;
        const tokenResult = await deployProxyToken({
          name: displayName,
          symbol: proxy?.ticker ?? xHandle.toUpperCase().slice(0, 5),
          proxyId,
          creatorAddress: walletAddress,
          imageUrl: proxy?.avatarUrl ?? undefined,
          description: `Digital clone of ${displayName}. Chat with me at ${appUrl}/${xHandle}`,
        });
        tokenInfo = {
          tokenAddress: tokenResult.tokenAddress,
          ticker: tokenResult.ticker,
        };
        logger.info("Token deployed", {
          proxyId,
          tokenAddress: tokenResult.tokenAddress,
          ticker: tokenResult.ticker,
          txHash: tokenResult.txHash,
        });
      }

      // Send completion tweet as a reply to the original mention
      if (tweetId) {
        try {
          await sendCompletionReply(xHandle, proxyId, tweetId, tokenInfo);
          logger.info("Completion tweet sent", { xHandle, tweetId, tokenInfo });
        } catch (replyErr) {
          // Don't fail the whole task if the tweet fails
          logger.warn("Failed to send completion tweet", {
            error: replyErr instanceof Error ? replyErr.message : String(replyErr),
          });
        }
      }

      return result;
    } catch (error) {
      // Log failure — truncate detail to avoid cascading DB errors from long messages
      const errorDetail = (error instanceof Error ? error.message : "Unknown error").slice(0, 500);
      try {
        await db.insert(ingestionLogs).values({
          proxyId,
          step: "error",
          status: "failed",
          detail: errorDetail,
          finishedAt: new Date(),
        });
      } catch {
        // Swallow — don't let logging failures mask the real error
      }

      const maxAttempts = 3; // matches retry.maxAttempts above
      const isLastAttempt = ctx.attempt.number >= maxAttempts;

      logger.error("Proxy ingestion failed", {
        proxyId,
        xHandle,
        attempt: ctx.attempt.number,
        isLastAttempt,
        error: error instanceof Error ? error.message : String(error),
      });

      // On final attempt: mark proxy as failed and notify the user
      if (isLastAttempt) {
        try {
          const { updateProxy } = await import("@/lib/db/queries");
          await updateProxy(proxyId, { status: "failed" });
        } catch {
          // Don't mask the real error
        }

        if (tweetId) {
          await sendTweet(
            `@${xHandle} Sorry, something went wrong while building your proxy. Our team has been notified. Please try again later!`,
            tweetId,
          ).catch(() => {});
        }
      }

      throw error; // Re-throw so Trigger.dev retries
    }
  },
});
