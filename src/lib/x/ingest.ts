import { getUserByUsername, getAllUserTweets } from "./client";
import { filterTrash } from "./filter";
import { selectTopPosts } from "./scorer";
import { reconstructThreads, threadsToSyntheticTweets } from "./threads";
import { embedAndStoreChunks } from "@/lib/ai/embeddings";
import { analyzeVoice } from "@/lib/ai/voice-analysis";
import { buildCoreBrain } from "@/lib/ai/brain-builder";
import { selectWritingExamples } from "@/lib/ai/example-selector";
import { updateProxy } from "@/lib/db/queries";

interface IngestResult {
  tweetsCollected: number;
  threadsDetected: number;
  afterFilter: number;
  topSelected: number;
  chunksStored: number;
  voiceProfile: Record<string, unknown>;
  coreBrain: Record<string, unknown>;
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
 * 10. Update proxy record
 */
export async function runFullIngestion(
  proxyId: string,
  xHandle: string,
  onProgress?: (step: string, detail: string) => void,
  maxTweets = 500,
): Promise<IngestResult> {
  const log = (step: string, detail: string) => onProgress?.(step, detail);

  // Step 1: Get user profile
  log("fetch_user", `Looking up @${xHandle}...`);
  const xUser = await getUserByUsername(xHandle);
  if (!xUser) throw new Error(`X user @${xHandle} not found`);

  // Step 2: Update proxy with profile data
  log("update_profile", "Updating proxy profile...");
  await updateProxy(proxyId, {
    displayName: xUser.name,
    avatarUrl: xUser.profile_image_url?.replace("_normal", "_400x400"),
    bio: xUser.description,
  });

  // Step 3: Pull all tweets
  log("fetch_tweets", "Pulling tweets from X...");
  const allTweets = await getAllUserTweets(xUser.id, maxTweets);
  log("fetch_tweets", `Collected ${allTweets.length} tweets`);

  // Step 4: Reconstruct threads
  log("threads", "Reconstructing threads...");
  const { standalones, threads } = reconstructThreads(allTweets, xUser.id);
  const syntheticThreadTweets = threadsToSyntheticTweets(threads);
  const unifiedTweets = [...standalones, ...syntheticThreadTweets];
  log("threads", `Found ${threads.length} threads (${standalones.length} standalones)`);

  // Step 5: Filter trash
  log("filter", "Filtering low-quality content...");
  const filtered = filterTrash(unifiedTweets);
  log("filter", `${filtered.length} tweets after filtering (removed ${unifiedTweets.length - filtered.length})`);

  // Step 6: Score and select top posts
  log("score", "Scoring and selecting top posts...");
  const topPosts = selectTopPosts(filtered, 1000);
  log("score", `Selected ${topPosts.length} top posts`);

  // Step 7: Embed and store
  log("embed", "Generating embeddings and storing chunks...");
  const chunks = topPosts.map((sp) => ({
    text: sp.tweet.text,
    contentType: sp.contentType,
    tweetId: sp.tweet.id,
    priority: Math.round(sp.score),
    qualityScore: sp.score,
  }));
  const stored = await embedAndStoreChunks(proxyId, chunks);
  log("embed", `Stored ${stored} chunks with embeddings`);

  // Step 8: Voice analysis (multi-pass)
  log("voice", "Analyzing writing voice (3-pass)...");
  const texts = topPosts.slice(0, 500).map((sp) => sp.tweet.text);
  const voiceProfile = await analyzeVoice(texts);
  log("voice", "Voice profile generated");

  // Step 9: Select writing examples (few-shot for chat)
  log("examples", "Selecting representative writing examples...");
  const exampleTexts = topPosts.slice(0, 200).map((sp) => sp.tweet.text);
  const writingExamples = await selectWritingExamples(exampleTexts);
  log("examples", `Selected ${writingExamples.length} writing examples`);

  // Step 10: Build core brain (topic-clustered)
  log("brain", "Building core brain (topic-clustered)...");
  const brainTexts = topPosts.slice(0, 300).map((sp) => sp.tweet.text);
  const voiceRecord = JSON.parse(JSON.stringify(voiceProfile)) as Record<string, unknown>;
  const coreBrain = await buildCoreBrain(brainTexts, voiceRecord);
  log("brain", "Core brain built");

  // Step 11: Update proxy with brain data
  log("finalize", "Saving brain to proxy...");
  await updateProxy(proxyId, {
    voiceProfile: voiceProfile as unknown as Record<string, unknown>,
    coreBrain: coreBrain as unknown as Record<string, unknown>,
    writingExamples: writingExamples as unknown as Record<string, unknown>,
    status: "live",
  });

  log("complete", "Proxy is now live!");

  return {
    tweetsCollected: allTweets.length,
    threadsDetected: threads.length,
    afterFilter: filtered.length,
    topSelected: topPosts.length,
    chunksStored: stored ?? 0,
    voiceProfile: voiceProfile as unknown as Record<string, unknown>,
    coreBrain: coreBrain as unknown as Record<string, unknown>,
  };
}

