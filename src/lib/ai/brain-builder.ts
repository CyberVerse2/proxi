/**
 * Topic-clustered brain building with structured outputs.
 *
 * The implementation is split across:
 * - `brain-builder/schemas.ts`
 * - `brain-builder/prompts.ts`
 * - `brain-builder/pipeline.ts`
 */

import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { generateStructured } from './structured';
import { CLUSTER_PROMPT } from './brain-builder/prompts';
import { buildTopicSummary, analyzeReasoningStyle, synthesizeBrain } from './brain-builder/pipeline';
import { topicClusterSchema, type CoreBrain } from './brain-builder/schemas';

const model = anthropic('claude-haiku-3');
const MAX_TOPIC_CLUSTERS = 5;

export interface TopicCluster {
  topic: string;
  tweetIndices: number[];
}

/**
 * Phase 1: Cluster tweets into topic groups.
 */
export async function clusterByTopic(posts: string[]): Promise<TopicCluster[]> {
  const numbered = posts.map((p, i) => `[${i}] ${p}`).join('\n---\n');

  const result = await generateStructured({
    model,
    schema: z.object({
      clusters: z
        .array(topicClusterSchema)
        .describe('4-6 topic clusters covering all post indices')
    }),
    label: 'brain-clusters',
    maxOutputTokens: 1800,
    prompt: CLUSTER_PROMPT.replace('{POSTS}', numbered),
    retryOnFailure: false
  });

  return normalizeClusters(result.clusters, posts.length);
}

/**
 * Full brain building pipeline.
 */
export async function buildCoreBrain(
  posts: string[],
  voiceProfile: Record<string, unknown>
): Promise<CoreBrain> {
  const postSample = posts.slice(0, 120);

  // Phase 1: Cluster
  const clusters = await clusterByTopic(postSample);

  // Phase 2 + 2.5: Run topic summaries and reasoning analysis in parallel.
  const topicSummariesPromise = (async () => {
    const summaries: { topic: string; summary: Awaited<ReturnType<typeof buildTopicSummary>> }[] = [];
    const batchSize = 2;
    for (let i = 0; i < clusters.length; i += batchSize) {
      const batch = clusters.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map(async (cluster) => {
          const clusterPosts = cluster.tweetIndices
            .filter((idx) => idx < postSample.length)
            .map((idx) => postSample[idx]);
          if (clusterPosts.length === 0) return null;
          const summary = await buildTopicSummary(cluster.topic, clusterPosts);
          return { topic: cluster.topic, summary };
        })
      );
      for (const r of results) {
        if (r) summaries.push(r);
      }
    }
    return summaries;
  })();

  const reasoningPromise = analyzeReasoningStyle(postSample);

  const [topicSummaries, reasoningAnalysis] = await Promise.all([
    topicSummariesPromise,
    reasoningPromise
  ]);

  // Phase 3: Synthesize (now includes reasoning analysis)
  return synthesizeBrain(topicSummaries, voiceProfile, reasoningAnalysis);
}

function normalizeClusters(clusters: TopicCluster[], postCount: number): TopicCluster[] {
  const sanitized = clusters
    .map((cluster) => ({
      topic: cluster.topic.trim() || 'General / Miscellaneous',
      tweetIndices: cluster.tweetIndices.filter((idx) => idx >= 0 && idx < postCount)
    }))
    .filter((cluster) => cluster.tweetIndices.length > 0)
    .sort((a, b) => b.tweetIndices.length - a.tweetIndices.length);

  const deduped: TopicCluster[] = [];
  const seen = new Set<number>();

  for (const cluster of sanitized) {
    const uniqueIndices = cluster.tweetIndices.filter((idx) => {
      if (seen.has(idx)) return false;
      seen.add(idx);
      return true;
    });

    if (uniqueIndices.length > 0) {
      deduped.push({ topic: cluster.topic, tweetIndices: uniqueIndices });
    }
  }

  const kept = deduped.slice(0, MAX_TOPIC_CLUSTERS);
  const overflow = deduped.slice(MAX_TOPIC_CLUSTERS).flatMap((cluster) => cluster.tweetIndices);
  if (overflow.length > 0) {
    kept.push({ topic: 'General / Miscellaneous', tweetIndices: overflow });
  }

  const covered = new Set(kept.flatMap((cluster) => cluster.tweetIndices));
  const missing: number[] = [];
  for (let i = 0; i < postCount; i++) {
    if (!covered.has(i)) missing.push(i);
  }

  if (missing.length > 0) {
    const misc = kept.find((cluster) => cluster.topic === 'General / Miscellaneous');
    if (misc) {
      misc.tweetIndices.push(...missing);
    } else {
      kept.push({ topic: 'General / Miscellaneous', tweetIndices: missing });
    }
  }

  return kept;
}
