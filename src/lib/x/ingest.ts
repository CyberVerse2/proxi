import { updateProxy } from '@/lib/db/queries';
import type { XTweet } from './client';
import {
  buildUnifiedTweets,
  classifyAndAssignCategory,
  filterAndSelectTopPosts,
  resolveTweetSource,
  storeEmbeddingsAndArtifacts
} from './ingest/steps';

interface IngestResult {
  tweetsCollected: number;
  threadsDetected: number;
  afterFilter: number;
  topSelected: number;
  chunksStored: number;
  voiceProfile: Record<string, unknown>;
  coreBrain: Record<string, unknown>;
  categorySlug?: string;
}

/**
 * Full ingestion pipeline:
 *  1. Fetch X user profile
 *  2. Pull all available tweets
 *  3. Reconstruct threads (stitch self-reply chains)
 *  4. Filter trash content
 *  5. Score and select top posts (with topic diversity)
 *  6. Embed and store chunks (with enriched metadata)
 *  7. Multi-pass voice analysis
 *  8. Select writing examples (few-shot)
 *  9. Topic-clustered brain building
 * 10. AI-powered category classification
 * 11. Save AI artifacts (token deployment happens after this)
 */
export async function runFullIngestion(
  proxyId: string,
  xHandle: string,
  onProgress?: (step: string, detail: string) => void,
  maxTweets = 200,
  /** Pre-loaded tweets — skips X API calls when provided (for testing). */
  prefetchedTweets?: XTweet[]
): Promise<IngestResult> {
  const log = (step: string, detail: string) => onProgress?.(step, detail);
  const { allTweets, userId, userBio, followerCount } = await resolveTweetSource(
    xHandle,
    proxyId,
    maxTweets,
    log,
    prefetchedTweets
  );
  const { unifiedTweets, threadsDetected } = buildUnifiedTweets(allTweets, userId, log);
  const { filtered, topPosts } = filterAndSelectTopPosts(unifiedTweets, log);
  const { stored, voiceProfile, writingExamples, coreBrain } = await storeEmbeddingsAndArtifacts(
    proxyId,
    topPosts,
    log
  );
  const { categorySlug } = await classifyAndAssignCategory(
    proxyId,
    userBio,
    followerCount,
    coreBrain as unknown as Record<string, unknown>,
    log
  );

  // Save AI artifacts, but keep the proxy in a non-live state until token deployment succeeds.
  log('finalize', 'Saving AI artifacts to proxy...');
  await updateProxy(proxyId, {
    voiceProfile: voiceProfile as unknown as Record<string, unknown>,
    coreBrain: coreBrain as unknown as Record<string, unknown>,
    writingExamples: writingExamples as unknown as Record<string, unknown>,
  });

  log('complete', 'AI artifacts saved; waiting for token deployment.');

  return {
    tweetsCollected: allTweets.length,
    threadsDetected,
    afterFilter: filtered.length,
    topSelected: topPosts.length,
    chunksStored: stored ?? 0,
    voiceProfile: voiceProfile as unknown as Record<string, unknown>,
    coreBrain: coreBrain as unknown as Record<string, unknown>,
    categorySlug,
  };
}
