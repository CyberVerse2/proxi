/**
 * Inngest event-driven function: launch-proxy-token
 *
 * Handles token deployment independently from AI ingestion so launch retries
 * never recompute expensive proxy artifacts.
 */

import { inngest } from "./client";
import { sendCompletionReply } from "@/lib/x/bot";
import { db } from "@/lib/db";
import { ingestionLogs } from "@/lib/db/schema";
import { deployProxyToken } from "@/lib/chain/token";
import { getProxyById } from "@/lib/db/queries";
import { createLogger } from '@/lib/observability/logger';
import { assertEnvPresent } from '@/lib/config/env';

function hasSavedArtifacts(proxy: Awaited<ReturnType<typeof getProxyById>>): boolean {
  return Boolean(proxy?.voiceProfile && proxy?.coreBrain && proxy?.writingExamples);
}

export const launchProxyToken = inngest.createFunction(
  {
    id: "launch-proxy-token",
    concurrency: [{ limit: 2 }],
    retries: 5,
  },
  { event: "proxy/tokenize.requested" },
  async ({ event }) => {
    const { proxyId, xHandle, tweetId, walletAddress } = event.data as {
      proxyId: string;
      xHandle: string;
      tweetId?: string;
      walletAddress: string;
    };

    const logger = createLogger('launch-proxy-token');
    logger.info('Starting token launch', { proxyId, xHandle, walletAddress });

    const logStep = async (step: string, status: "in_progress" | "success" | "failed", detail: string) => {
      logger.info(`[${step}] ${detail}`, { proxyId, step, status });
      await db.insert(ingestionLogs).values({
        proxyId,
        step,
        status,
        detail,
        finishedAt: status === 'in_progress' ? null : new Date(),
      });
    };

    const proxy = await getProxyById(proxyId);
    if (!proxy) {
      throw new Error(`Proxy ${proxyId} not found`);
    }

    if (proxy.tokenAddress) {
      logger.info('Token already exists, skipping launch', { proxyId, tokenAddress: proxy.tokenAddress });
      if (proxy.status !== 'live') {
        const { updateProxy } = await import("@/lib/db/queries");
        await updateProxy(proxyId, { status: "live" });
      }
      return {
        tokenAddress: proxy.tokenAddress,
        ticker: proxy.ticker ?? xHandle.toUpperCase().slice(0, 5),
        success: true,
        chain: 'bsc',
      };
    }

    if (!hasSavedArtifacts(proxy)) {
      throw new Error(`Proxy ${proxyId} is missing saved AI artifacts; run ingestion before launch.`);
    }

    await logStep('token_launch', 'in_progress', 'Deploying token on BSC via Four.meme...');

    try {
      assertEnvPresent(['DEPLOYER_PRIVATE_KEY'], 'launch-proxy-token.token-deploy');
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://proxi.fun";
      const displayName = proxy.displayName ?? xHandle;
      const tokenResult = await deployProxyToken({
        name: displayName,
        symbol: proxy.ticker ?? xHandle.toUpperCase().slice(0, 5),
        proxyId,
        creatorAddress: walletAddress,
        imageUrl: proxy.avatarUrl ?? undefined,
        description: `Digital clone of ${displayName}. Chat with me at ${appUrl}/${xHandle}`,
      });

      await logStep(
        'token_launch_complete',
        'success',
        JSON.stringify({
          tokenAddress: tokenResult.tokenAddress,
          ticker: tokenResult.ticker,
          txHash: tokenResult.txHash,
        })
      );

      if (tweetId) {
        try {
          await sendCompletionReply(xHandle, proxyId, tweetId, {
            tokenAddress: tokenResult.tokenAddress,
            ticker: tokenResult.ticker,
          });
          logger.info('Completion tweet sent', { xHandle, tweetId, tokenAddress: tokenResult.tokenAddress });
        } catch (replyErr) {
          logger.warn('Failed to send completion tweet', {
            error: replyErr instanceof Error ? replyErr.message : String(replyErr)
          });
        }
      }

      return tokenResult;
    } catch (error) {
      const detail = (error instanceof Error ? error.message : String(error)).slice(0, 500);
      await logStep('token_launch_error', 'failed', detail).catch(() => {});
      logger.error('Token launch failed', {
        proxyId,
        xHandle,
        error: detail
      });
      throw error;
    }
  }
);
