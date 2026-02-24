import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';
import { generateStructured } from '../structured';
import { REASONING_PROMPT, SYNTHESIS_PROMPT, TOPIC_SUMMARY_PROMPT } from './prompts';
import {
  coreBrainSchema,
  reasoningAnalysisSchema,
  topicSummarySchema,
  type CoreBrain,
  type ReasoningAnalysis,
  type TopicSummary
} from './schemas';

const model = anthropic('claude-sonnet-4-20250514');

/**
 * Phase 2: Build a summary for a single topic cluster.
 */
export async function buildTopicSummary(
  topic: string,
  posts: string[]
): Promise<TopicSummary> {
  const sample = posts.join('\n---\n');

  return generateStructured({
    model,
    schema: topicSummarySchema,
    maxOutputTokens: 2000,
    prompt: TOPIC_SUMMARY_PROMPT.replace('{TOPIC}', topic).replace('{POSTS}', sample)
  });
}

/**
 * Phase 2.5: Analyze reasoning style, emotional patterns, and contradictions.
 * Runs on posts that show argumentation, explanation, or strong emotion.
 */
export async function analyzeReasoningStyle(posts: string[]): Promise<ReasoningAnalysis> {
  // Select posts that are likely argumentative, explanatory, or emotionally charged.
  const argumentativeMarkers = [
    'because',
    'therefore',
    'however',
    'actually',
    'disagree',
    'wrong',
    'the problem',
    "here's why",
    'hot take',
    'unpopular opinion',
    'thread',
    'let me explain',
    "people don't realize",
    'the truth is',
    'imo',
    'counterpoint',
    'but',
    'on the other hand',
    'i think',
    'honestly',
    'this is why',
    'the issue',
    'frustrated',
    'love this',
    'hate this',
    'insane',
    'ridiculous',
    'underrated',
    'overrated',
    'nobody talks about',
    '?',
    '!',
    '...'
  ];

  const scoredPosts = posts.map((post) => {
    const lower = post.toLowerCase();
    let score = 0;
    if (post.length > 150) score += 2;
    if (post.length > 300) score += 2;
    for (const marker of argumentativeMarkers) {
      if (lower.includes(marker)) score += 1;
    }
    return { post, score };
  });

  scoredPosts.sort((a, b) => b.score - a.score);
  const selected = scoredPosts.slice(0, 80).map((s) => s.post);

  if (selected.length < 5) {
    return {
      reasoningStyle:
        'Not enough argumentative or explanatory posts to determine a clear reasoning style.',
      emotionalTriggers: {},
      blindSpots: [],
      contradictions: [],
      vocabularyFingerprint: []
    };
  }

  const numbered = selected.map((p, i) => `[${i}] ${p}`).join('\n---\n');

  return generateStructured({
    model,
    schema: reasoningAnalysisSchema,
    maxOutputTokens: 4000,
    prompt: REASONING_PROMPT.replace('{POSTS}', numbered)
  });
}

/**
 * Phase 3: Synthesize the final brain from all topic summaries.
 */
export async function synthesizeBrain(
  topicSummaries: { topic: string; summary: TopicSummary }[],
  voiceProfile: Record<string, unknown>,
  reasoningAnalysis: ReasoningAnalysis
): Promise<CoreBrain> {
  const summariesStr = topicSummaries
    .map((ts) => `### ${ts.topic}\n${JSON.stringify(ts.summary, null, 2)}`)
    .join('\n\n');

  const topicNames = topicSummaries.map((ts) => ts.topic);

  const prompt = SYNTHESIS_PROMPT.replace('{VOICE}', JSON.stringify(voiceProfile, null, 2))
    .replace('{SUMMARIES}', summariesStr)
    .replace('{REASONING}', JSON.stringify(reasoningAnalysis, null, 2));

  const brain = await generateStructured({
    model,
    schema: coreBrainSchema,
    maxOutputTokens: 8000,
    prompt
  });

  // Verification step: ensure topic coverage
  // Uses a fuzzy match — checks if any significant word (3+ chars) from each
  // cluster topic appears in any opinion key. This avoids false warnings when
  // the model uses different but semantically equivalent key names.
  if (brain.opinions) {
    const coveredStr = Object.keys(brain.opinions).join(' ').toLowerCase();
    const stopWords = new Set(['and', 'the', 'for', 'with', 'from', 'about', 'into', 'over']);
    const missing = topicNames.filter((t) => {
      const words = t
        .toLowerCase()
        .split(/\W+/)
        .filter((w) => w.length >= 3 && !stopWords.has(w));
      return !words.some((w) => coveredStr.includes(w));
    });
    if (missing.length > 0) {
      // Soft warning — the brain is still usable, topics may be merged under different names
      console.warn(
        `[brain-builder] Some cluster topics may not have explicit opinion keys: ${missing.join(', ')}. ` +
          `This is usually fine — check if they're covered under related keys.`
      );
    }
  }

  return brain;
}

export const clusterResultSchema = z.object({
  clusters: z
    .array(
      z.object({
        topic: z.string(),
        tweetIndices: z.array(z.number())
      })
    )
    .describe('6-12 topic clusters covering all post indices')
});
