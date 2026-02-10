/**
 * Inngest event-driven function: ingest-proxy
 *
 * Wraps the full X data ingestion pipeline in a durable background function
 * with retry, progress logging, and concurrency control.
 *
 * Triggered by the "proxy/ingest.requested" event.
 */

import { inngest } from "./client";
import { runFullIngestion } from "@/lib/x/ingest";
import { sendCompletionReply } from "@/lib/x/bot";
import { sendTweet } from "@/lib/x/client";
import { db } from "@/lib/db";
import { ingestionLogs } from "@/lib/db/schema";
import { deployProxyToken } from "@/lib/chain/token";
import { getProxyById } from "@/lib/db/queries";

export const ingestProxy = inngest.createFunction(
  {
    id: "ingest-proxy",
    concurrency: [{ limit: 2 }],
    retries: 3,
  },
  { event: "proxy/ingest.requested" },
  async ({ event, attempt }) => {
    const { proxyId, xHandle, tweetId, maxTweets, walletAddress } = event.data as {
      proxyId: string;
      xHandle: string;
      tweetId?: string;
      maxTweets?: number;
      walletAddress: string;
    };

    console.log("[ingest] Starting proxy ingestion", { proxyId, xHandle, maxTweets });

    const logStep = async (step: string, detail: string) => {
      console.log(`[ingest] [${step}] ${detail}`, { proxyId, step });
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

      console.log("[ingest] Proxy ingestion complete", {
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
        console.log("[ingest] Token already deployed, skipping", {
          proxyId,
          tokenAddress: proxy.tokenAddress,
        });
        tokenInfo = {
          tokenAddress: proxy.tokenAddress,
          ticker: proxy.ticker ?? xHandle.toUpperCase().slice(0, 5),
        };
      } else {
        console.log("[ingest] Deploying token for proxy", { proxyId, walletAddress });
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
        console.log("[ingest] Token deployed", {
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
          console.log("[ingest] Completion tweet sent", { xHandle, tweetId, tokenInfo });
        } catch (replyErr) {
          // Don't fail the whole task if the tweet fails
          console.warn("[ingest] Failed to send completion tweet", {
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

      const maxAttempts = 3;
      const isLastAttempt = attempt >= maxAttempts;

      console.error("[ingest] Proxy ingestion failed", {
        proxyId,
        xHandle,
        attempt,
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

      throw error; // Re-throw so Inngest retries
    }
  },
);
