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
import { sendTweet } from "@/lib/x/client";
import { db } from "@/lib/db";
import { ingestionLogs } from "@/lib/db/schema";
import { getProxyById } from "@/lib/db/queries";
import { and, desc, eq } from 'drizzle-orm';
import { createLogger } from '@/lib/observability/logger';

function hasSavedArtifacts(proxy: Awaited<ReturnType<typeof getProxyById>>): boolean {
  return Boolean(proxy?.voiceProfile && proxy?.coreBrain && proxy?.writingExamples);
}

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
      walletAddress?: string;
    };

    const logger = createLogger('ingest-proxy');
    logger.info('Starting proxy ingestion', { proxyId, xHandle, maxTweets, attempt });

    const existingComplete = await db
      .select()
      .from(ingestionLogs)
      .where(and(eq(ingestionLogs.proxyId, proxyId), eq(ingestionLogs.step, 'complete')))
      .orderBy(desc(ingestionLogs.startedAt))
      .limit(1);
    const currentProxy = await getProxyById(proxyId);
    if (existingComplete.length > 0 && currentProxy?.status === 'live' && currentProxy.tokenAddress) {
      logger.info('Skipping duplicate ingestion event for already-live proxy', {
        proxyId,
        tokenAddress: currentProxy.tokenAddress
      });
      return {
        tweetsCollected: 0,
        threadsDetected: 0,
        afterFilter: 0,
        topSelected: 0,
        chunksStored: 0,
        voiceProfile: currentProxy.voiceProfile as Record<string, unknown>,
        coreBrain: currentProxy.coreBrain as Record<string, unknown>
      };
    }

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
      const shouldReuseArtifacts = hasSavedArtifacts(currentProxy);
      const result = shouldReuseArtifacts
        ? {
            tweetsCollected: 0,
            threadsDetected: 0,
            afterFilter: 0,
            topSelected: 0,
            chunksStored: 0,
            voiceProfile: currentProxy?.voiceProfile as Record<string, unknown>,
            coreBrain: currentProxy?.coreBrain as Record<string, unknown>
          }
        : await runFullIngestion(
            proxyId,
            xHandle,
            async (step, detail) => {
              await logStep(step, detail);
            },
            maxTweets,
          );

      if (shouldReuseArtifacts) {
        logger.info('Skipping AI ingestion and reusing saved artifacts', { proxyId });
      } else {
        logger.info('Proxy ingestion complete', {
          proxyId,
          xHandle,
          tweetsCollected: result.tweetsCollected,
          topSelected: result.topSelected
        });
      }

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

      if (walletAddress) {
        logger.info('Queueing token launch after successful artifact build', { proxyId, walletAddress });
        await inngest.send({
          name: 'proxy/tokenize.requested',
          data: {
            proxyId,
            xHandle,
            tweetId,
            walletAddress,
          },
        });
      } else {
        logger.info('Artifact build complete; no wallet provided so token launch was not queued', { proxyId });
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

      logger.error('Proxy ingestion failed', {
        proxyId,
        xHandle,
        attempt,
        isLastAttempt,
        error: error instanceof Error ? error.message : String(error)
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
