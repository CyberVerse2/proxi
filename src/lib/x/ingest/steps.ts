import type { XTweet } from '../client';
import { getAllUserTweets, getUserByUsername } from '../client';
import { reconstructThreads, threadsToSyntheticTweets } from '../threads';
import { filterTrash } from '../filter';
import { selectTopPosts } from '../scorer';
import { embedAndStoreChunks } from '@/lib/ai/embeddings';
import { analyzeVoice } from '@/lib/ai/voice-analysis';
import { selectWritingExamples } from '@/lib/ai/example-selector';
import { buildCoreBrain } from '@/lib/ai/brain-builder';
import { classifyProxy } from '@/lib/ai/classifier';
import { getCategoryBySlug, updateProxy } from '@/lib/db/queries';

export async function resolveTweetSource(
  xHandle: string,
  proxyId: string,
  maxTweets: number,
  log: (step: string, detail: string) => void,
  prefetchedTweets?: XTweet[]
) {
  let allTweets: XTweet[];
  let userId: string;
  let userBio: string | null = null;
  let followerCount = 0;

  if (prefetchedTweets && prefetchedTweets.length > 0) {
    // Skip X API — use provided tweets
    log('fetch_user', `Using prefetched data for @${xHandle}`);
    allTweets = prefetchedTweets;
    userId = 'mock';
    log('fetch_tweets', `Loaded ${allTweets.length} prefetched tweets`);
  } else {
    log('fetch_user', `Looking up @${xHandle}...`);
    const xUser = await getUserByUsername(xHandle);
    if (!xUser) throw new Error(`X user @${xHandle} not found`);
    userId = xUser.id;
    userBio = xUser.description ?? null;
    followerCount = xUser.public_metrics?.followers_count ?? 0;

    log('update_profile', 'Updating proxy profile...');
    await updateProxy(proxyId, {
      displayName: xUser.name,
      avatarUrl: xUser.profile_image_url?.replace('_normal', '_400x400'),
      bio: xUser.description
    });

    log('fetch_tweets', 'Pulling tweets from X...');
    allTweets = await getAllUserTweets(xUser.id, maxTweets);
    log('fetch_tweets', `Collected ${allTweets.length} tweets`);
  }

  return { allTweets, userId, userBio, followerCount };
}

export function buildUnifiedTweets(
  allTweets: XTweet[],
  userId: string,
  log: (step: string, detail: string) => void
) {
  log('threads', 'Reconstructing threads...');
  const { standalones, threads } = reconstructThreads(allTweets, userId);
  const syntheticThreadTweets = threadsToSyntheticTweets(threads);
  const unifiedTweets = [...standalones, ...syntheticThreadTweets];
  log('threads', `Found ${threads.length} threads (${standalones.length} standalones)`);
  return { unifiedTweets, threadsDetected: threads.length };
}

export function filterAndSelectTopPosts(
  unifiedTweets: XTweet[],
  log: (step: string, detail: string) => void
) {
  log('filter', 'Filtering low-quality content...');
  const filtered = filterTrash(unifiedTweets);
  log('filter', `${filtered.length} tweets after filtering (removed ${unifiedTweets.length - filtered.length})`);

  log('score', 'Scoring and selecting top posts...');
  const topPosts = selectTopPosts(filtered, 1000);
  log('score', `Selected ${topPosts.length} top posts`);

  return { filtered, topPosts };
}

export async function storeEmbeddingsAndArtifacts(
  proxyId: string,
  topPosts: ReturnType<typeof selectTopPosts>,
  log: (step: string, detail: string) => void
) {
  log('embed', 'Generating embeddings and storing chunks...');
  const chunks = topPosts.map((sp) => ({
    text: sp.tweet.text,
    contentType: sp.contentType,
    tweetId: sp.tweet.id,
    priority: Math.round(sp.score),
    qualityScore: sp.score
  }));
  const stored = await embedAndStoreChunks(proxyId, chunks);
  log('embed', `Stored ${stored} chunks with embeddings`);

  log('voice', 'Analyzing writing voice (3-pass)...');
  const texts = topPosts.slice(0, 500).map((sp) => sp.tweet.text);
  const voiceProfile = await analyzeVoice(texts);
  log('voice', 'Voice profile generated');

  log('examples', 'Selecting representative writing examples...');
  const exampleTexts = topPosts.slice(0, 200).map((sp) => sp.tweet.text);
  const writingExamples = await selectWritingExamples(exampleTexts);
  log('examples', `Selected ${writingExamples.length} writing examples`);

  log('brain', 'Building core brain (topic-clustered)...');
  const brainTexts = topPosts.slice(0, 300).map((sp) => sp.tweet.text);
  const voiceRecord = JSON.parse(JSON.stringify(voiceProfile)) as Record<string, unknown>;
  const coreBrain = await buildCoreBrain(brainTexts, voiceRecord);
  log('brain', 'Core brain built');

  return { stored, voiceProfile, writingExamples, coreBrain };
}

export async function classifyAndAssignCategory(
  proxyId: string,
  userBio: string | null,
  followerCount: number,
  coreBrain: Record<string, unknown>,
  log: (step: string, detail: string) => void
) {
  let categorySlug: string | undefined;
  try {
    log('classify', 'Classifying proxy category...');
    const topicMap = coreBrain.topicMap as Record<string, string[]> | undefined;
    const opinions = coreBrain.opinions as Record<string, string> | undefined;
    const topics = [...Object.keys(topicMap ?? {}), ...Object.keys(opinions ?? {})];

    const classification = await classifyProxy({
      bio: userBio,
      followerCount,
      topics
    });
    categorySlug = classification.category;
    log(
      'classify',
      `Category: ${classification.category} (${(classification.confidence * 100).toFixed(0)}% confidence — ${classification.reasoning})`
    );

    const category = await getCategoryBySlug(classification.category);
    if (category) {
      await updateProxy(proxyId, { categoryId: category.id });
      log('classify', `Assigned category: ${category.name}`);
    } else {
      log('classify', `Category "${classification.category}" not found in DB — run npm run db:seed`);
    }
  } catch (classifyErr) {
    // Non-fatal: proxy still works without a category
    log('classify', `Classification failed: ${classifyErr instanceof Error ? classifyErr.message : String(classifyErr)}`);
  }

  return { categorySlug };
}
