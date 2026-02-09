import { getUserByUsername, getAllUserTweets } from "./client";
import { filterTrash } from "./filter";
import { selectTopPosts } from "./scorer";
import { reconstructThreads, threadsToSyntheticTweets } from "./threads";
import { embedAndStoreChunks } from "@/lib/ai/embeddings";
import { analyzeVoice } from "@/lib/ai/voice-analysis";
import { buildCoreBrain } from "@/lib/ai/brain-builder";
import { selectWritingExamples } from "@/lib/ai/example-selector";
import { classifyProxy } from "@/lib/ai/classifier";
import { updateProxy, getCategoryBySlug } from "@/lib/db/queries";

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
 * 11. Update proxy record
 */
export async function runFullIngestion(
  proxyId: string,
  xHandle: string,
  onProgress?: (step: string, detail: string) => void,
  maxTweets = 200,
  /** Pre-loaded tweets — skips X API calls when provided (for testing). */
  prefetchedTweets?: import("./client").XTweet[],
): Promise<IngestResult> {
  const log = (step: string, detail: string) => onProgress?.(step, detail);

  let allTweets: import("./client").XTweet[];
  let userId: string;
  let userBio: string | null = null;
  let followerCount = 0;

  if (prefetchedTweets && prefetchedTweets.length > 0) {
    // Skip X API — use provided tweets
    log("fetch_user", `Using prefetched data for @${xHandle}`);
    allTweets = prefetchedTweets;
    userId = "mock";
    log("fetch_tweets", `Loaded ${allTweets.length} prefetched tweets`);
  } else {
    // Step 1: Get user profile
    log("fetch_user", `Looking up @${xHandle}...`);
    const xUser = await getUserByUsername(xHandle);
    if (!xUser) throw new Error(`X user @${xHandle} not found`);
    userId = xUser.id;
    userBio = xUser.description ?? null;
    followerCount = xUser.public_metrics?.followers_count ?? 0;

    // Step 2: Update proxy with profile data
    log("update_profile", "Updating proxy profile...");
    await updateProxy(proxyId, {
      displayName: xUser.name,
      avatarUrl: xUser.profile_image_url?.replace("_normal", "_400x400"),
      bio: xUser.description,
    });

    // Step 3: Pull all tweets
    log("fetch_tweets", "Pulling tweets from X...");
    allTweets = await getAllUserTweets(xUser.id, maxTweets);
    log("fetch_tweets", `Collected ${allTweets.length} tweets`);
  }

  // Step 4: Reconstruct threads
  log("threads", "Reconstructing threads...");
  const { standalones, threads } = reconstructThreads(allTweets, userId);
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

  // Step 11: Classify into a category
  let categorySlug: string | undefined;
  try {
    log("classify", "Classifying proxy category...");
    // Extract topics from brain's topicMap and opinions
    const brainRecord = coreBrain as unknown as Record<string, unknown>;
    const topicMap = brainRecord.topicMap as Record<string, string[]> | undefined;
    const opinions = brainRecord.opinions as Record<string, string> | undefined;
    const topics = [
      ...Object.keys(topicMap ?? {}),
      ...Object.keys(opinions ?? {}),
    ];

    const classification = await classifyProxy({
      bio: userBio,
      followerCount,
      topics,
    });
    categorySlug = classification.category;
    log("classify", `Category: ${classification.category} (${(classification.confidence * 100).toFixed(0)}% confidence — ${classification.reasoning})`);

    // Look up the category ID and assign it
    const category = await getCategoryBySlug(classification.category);
    if (category) {
      await updateProxy(proxyId, { categoryId: category.id });
      log("classify", `Assigned category: ${category.name}`);
    } else {
      log("classify", `Category "${classification.category}" not found in DB — run npm run db:seed`);
    }
  } catch (classifyErr) {
    // Non-fatal: proxy still works without a category
    log("classify", `Classification failed: ${classifyErr instanceof Error ? classifyErr.message : String(classifyErr)}`);
  }

  // Step 12: Update proxy with brain data
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
    categorySlug,
  };
}

