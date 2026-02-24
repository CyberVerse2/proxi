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

const model = anthropic('claude-sonnet-4-20250514');

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
        .describe('6-12 topic clusters covering all post indices')
    }),
    maxOutputTokens: 4000,
    prompt: CLUSTER_PROMPT.replace('{POSTS}', numbered)
  });

  return result.clusters;
}

/**
 * Full brain building pipeline.
 */
export async function buildCoreBrain(
  posts: string[],
  voiceProfile: Record<string, unknown>
): Promise<CoreBrain> {
  const postSample = posts.slice(0, 300);

  // Phase 1: Cluster
  const clusters = await clusterByTopic(postSample);

  // Phase 2 + 2.5: Run topic summaries and reasoning analysis in parallel.
  const topicSummariesPromise = (async () => {
    const summaries: { topic: string; summary: Awaited<ReturnType<typeof buildTopicSummary>> }[] = [];
    const batchSize = 4;
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
