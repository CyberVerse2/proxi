/**
 * Topic-clustered brain building with structured outputs.
 *
 * Instead of dumping 300 tweets into one prompt, we:
 *   1.   Cluster tweets by topic (structured output)
 *   2.   Build per-topic summaries with beliefs, opinions, knowledge, and reasoning patterns
 *   2.5  Analyze reasoning style, emotional triggers, contradictions, and blind spots
 *        (runs in parallel with step 2 — independent of topic clusters)
 *   3.   Synthesize the full CoreBrain from topic summaries + reasoning analysis
 *
 * All LLM calls use `generateObject` with Zod schemas for guaranteed valid JSON.
 */

import { generateText, Output } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import { z } from 'zod';

/* ------------------------------------------------------------------ */
/*  Schemas                                                            */
/* ------------------------------------------------------------------ */

const topicClusterSchema = z.object({
  topic: z
    .string()
    .describe("Clear, descriptive topic name (e.g. 'AI & Technology', 'Crypto Markets')"),
  tweetIndices: z.array(z.number()).describe('Array of post indices that belong to this topic')
});

const topicSummarySchema = z.object({
  beliefs: z
    .array(z.string())
    .describe('3-8 core beliefs on this topic, each specific and testable'),
  opinions: z
    .record(z.string(), z.string())
    .describe('Subtopic -> their specific stance, using their own words'),
  knowledge: z.array(z.string()).describe('Key facts, insights, or expertise they demonstrate'),
  faq: z
    .array(
      z.object({
        question: z.string().describe('Likely question someone would ask about this topic'),
        answer: z.string().describe('How this person would answer IN THEIR VOICE — not generic')
      })
    )
    .describe("2-5 likely questions and answers in this person's voice"),
  reasoningPatterns: z.array(z.string()).describe('How they argue/persuade/explain on this topic'),
  emotionalReactions: z
    .record(z.string(), z.string())
    .describe('Trigger -> how they react emotionally')
});

const reasoningAnalysisSchema = z.object({
  reasoningStyle: z
    .string()
    .describe(
      '2-3 paragraph description of HOW this person reasons — first principles vs analogy, data vs intuition, hedging vs committing, etc.'
    ),
  emotionalTriggers: z
    .record(z.string(), z.string())
    .describe('Trigger category -> what provokes this reaction and how it shows in their writing'),
  blindSpots: z
    .array(z.string())
    .describe('Topics they avoid, biases they display without awareness'),
  contradictions: z
    .array(z.string())
    .describe('Tensions between their stated beliefs or behaviors'),
  vocabularyFingerprint: z
    .array(z.string())
    .describe('Distinctive phrases, recurring metaphors, verbal tics unique to this person')
});

const coreBrainSchema = z.object({
  beliefs: z
    .array(z.string())
    .describe('8-15 core beliefs and values, synthesized across all topics'),
  opinions: z.record(z.string(), z.string()).describe('topic/subtopic -> their specific stance'),
  topicMap: z
    .record(z.string(), z.array(z.string()))
    .describe('category -> subtopics they frequently discuss'),
  faq: z
    .array(
      z.object({
        question: z.string(),
        answer: z.string().describe("How they'd answer in their exact voice")
      })
    )
    .describe('8-15 FAQ entries spanning different topics'),
  personality: z
    .string()
    .describe('2-3 paragraph personality summary — vivid, specific, like a character bible'),
  background: z.string().describe('Inferred background, expertise, and bio — grounded in evidence'),
  reasoningStyle: z
    .string()
    .describe(
      '2-3 paragraphs on HOW they think — argumentative approach, handling disagreement, weighing evidence'
    ),
  emotionalTriggers: z
    .record(z.string(), z.string())
    .describe('trigger_category -> what provokes this reaction and how it shows up'),
  blindSpots: z
    .array(z.string())
    .describe('Topics they avoid, perspectives they never engage with, biases'),
  contradictions: z
    .array(z.string())
    .describe('Specific tensions between stated beliefs or behaviors — human complexity'),
  vocabularyFingerprint: z
    .array(z.string())
    .describe('5-15 distinctive phrases, metaphors, coined terms, verbal tics')
});

/* ------------------------------------------------------------------ */
/*  Exported types                                                     */
/* ------------------------------------------------------------------ */

export type CoreBrain = z.infer<typeof coreBrainSchema>;

export interface TopicCluster {
  topic: string;
  tweetIndices: number[];
}

/* ------------------------------------------------------------------ */
/*  Prompts                                                            */
/* ------------------------------------------------------------------ */

const CLUSTER_PROMPT = `You are grouping a person's posts by topic. Read all the posts and assign each post index to one of 6–12 topic clusters.

<posts>
{POSTS}
</posts>

Rules:
- Use clear, descriptive topic names (e.g. "AI & Technology", "Crypto Markets", "Personal Life").
- Aim for 6–12 clusters. Fewer is fine if the person has a narrow focus. Merge tiny clusters (<3 posts) into "General / Miscellaneous" rather than forcing a category.
- Every post index from 0 to the last post MUST appear in exactly one cluster. Do NOT skip any index.
- After building your clusters, mentally verify no index is missing or duplicated.`;

const TOPIC_SUMMARY_PROMPT = `You are building a detailed summary of a person's beliefs, opinions, knowledge, and reasoning on a specific topic. Only extract what is clearly expressed or strongly implied in the posts — do NOT fill in gaps with assumptions.

Topic: {TOPIC}

Their posts on this topic:
<posts>
{POSTS}
</posts>

Rules:
- Beliefs must be specific. NOT "they care about technology." YES "they believe open-source AI will outperform closed models within 5 years."
- FAQ answers should sound like the person wrote them, not like an encyclopedia.
- reasoningPatterns: look for posts where they're arguing, explaining, or defending a position. How do they build their case? What evidence do they reach for? Only include patterns clearly visible in the posts.
- emotionalReactions: look for posts with strong emotional valence — excitement, frustration, sarcasm, dismissiveness. What triggers each reaction?
- Include 2-5 items per field. Quality over quantity.`;

const SYNTHESIS_PROMPT = `You are synthesizing a comprehensive "Core Brain" for an AI clone. This brain will be used to make an AI respond as this specific person. It must be vivid, specific, and deeply faithful to the source material.

The clone must not only know WHAT this person thinks, but HOW they think, WHAT triggers them emotionally, WHERE their blind spots are, and WHERE they contradict themselves. A clone that's too internally consistent feels robotic — real people are messy.

<voice_profile>
{VOICE}
</voice_profile>

<topic_summaries>
{SUMMARIES}
</topic_summaries>

<reasoning_analysis>
{REASONING}
</reasoning_analysis>

Hard constraints (MUST follow):
- opinions MUST include at least one entry per topic summary provided above. Do not skip smaller topics.
- beliefs MUST be specific and testable. BAD: "values hard work." GOOD: "believes that shipping fast and iterating beats planning for months."
- background MUST be inferred from evidence in the posts, not invented.
- reasoningStyle MUST describe process, not conclusions. Two people can hold the same belief but arrive there differently.
- contradictions MUST be genuine tensions found in the source material, not invented for color.

Soft constraints (SHOULD follow):
- personality should read like a character bible for an actor — vivid, specific, full of "this person would" and "this person never." BAD: "They are passionate about technology." GOOD: "They treat every new AI model release like a sporting event, live-tweeting their benchmarks with the energy of a commentator calling a championship game."
- faq should have 8-15 entries spanning different topics. Answers should sound like the person wrote them — match their tone, length, and vocabulary from the voice profile.
- emotionalTriggers should have 3-6 entries. Each should feel like a cheat sheet for an actor: "when X happens, they do Y."
- blindSpots and contradictions are features, not bugs. Include 2-5 each if the evidence supports it. If not, include fewer — don't fabricate.
- vocabularyFingerprint should be 5-15 items. Only include language distinctive enough to identify this person in a blind lineup.

After generating the output, mentally verify that every topic from the summaries is represented in the opinions field.`;

const REASONING_PROMPT = `You are analyzing how a specific person THINKS — not what they think, but HOW they think. Focus on their reasoning patterns, emotional wiring, contradictions, and blind spots.

<posts>
{POSTS}
</posts>

These posts were selected because they contain argumentation, explanation, debate, or strong emotional reactions. Analyze them to extract the person's cognitive and emotional fingerprint.

Rules:
- Everything must be grounded in evidence from the posts. Quote or paraphrase specific examples where possible.
- reasoningStyle should capture their PROCESS, not their conclusions. Two people can believe the same thing but arrive there completely differently.
- contradictions are NOT a flaw to fix — they make the clone feel human. Include them without judgment.
- blindSpots: look for conspicuous absences. If someone tweets about tech daily but never mentions ethics, that's a blind spot.
- vocabularyFingerprint: be selective. Only include phrases that are genuinely distinctive. "Let's go" is not distinctive. "The alpha is in the delta" is.
- If a field has no clear evidence, use an empty array or a short honest statement like "not enough evidence in posts to determine."`;

/* ------------------------------------------------------------------ */
/*  Implementation                                                     */
/* ------------------------------------------------------------------ */

const model = anthropic('claude-sonnet-4-20250514');

/**
 * Phase 1: Cluster tweets into topic groups.
 */
export async function clusterByTopic(posts: string[]): Promise<TopicCluster[]> {
  const numbered = posts.map((p, i) => `[${i}] ${p}`).join('\n---\n');

  const { output } = await generateText({
    model,
    output: Output.object({
      schema: z.object({
        clusters: z
          .array(topicClusterSchema)
          .describe('6-12 topic clusters covering all post indices')
      })
    }),
    maxOutputTokens: 4000,
    prompt: CLUSTER_PROMPT.replace('{POSTS}', numbered)
  });

  return output!.clusters;
}

/**
 * Phase 2: Build a summary for a single topic cluster.
 */
async function buildTopicSummary(
  topic: string,
  posts: string[]
): Promise<z.infer<typeof topicSummarySchema>> {
  const sample = posts.join('\n---\n');

  const { output } = await generateText({
    model,
    output: Output.object({ schema: topicSummarySchema }),
    maxOutputTokens: 2000,
    prompt: TOPIC_SUMMARY_PROMPT.replace('{TOPIC}', topic).replace('{POSTS}', sample)
  });

  return output!;
}

/**
 * Phase 2.5: Analyze reasoning style, emotional patterns, and contradictions.
 * Runs on posts that show argumentation, explanation, or strong emotion.
 */
async function analyzeReasoningStyle(
  posts: string[]
): Promise<z.infer<typeof reasoningAnalysisSchema>> {
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

  const { output } = await generateText({
    model,
    output: Output.object({ schema: reasoningAnalysisSchema }),
    maxOutputTokens: 4000,
    prompt: REASONING_PROMPT.replace('{POSTS}', numbered)
  });

  return output!;
}

/**
 * Phase 3: Synthesize the final brain from all topic summaries.
 */
async function synthesizeBrain(
  topicSummaries: { topic: string; summary: z.infer<typeof topicSummarySchema> }[],
  voiceProfile: Record<string, unknown>,
  reasoningAnalysis: z.infer<typeof reasoningAnalysisSchema>
): Promise<CoreBrain> {
  const summariesStr = topicSummaries
    .map((ts) => `### ${ts.topic}\n${JSON.stringify(ts.summary, null, 2)}`)
    .join('\n\n');

  const topicNames = topicSummaries.map((ts) => ts.topic);

  const { output } = await generateText({
    model,
    output: Output.object({ schema: coreBrainSchema }),
    maxOutputTokens: 8000,
    prompt: SYNTHESIS_PROMPT.replace('{VOICE}', JSON.stringify(voiceProfile, null, 2))
      .replace('{SUMMARIES}', summariesStr)
      .replace('{REASONING}', JSON.stringify(reasoningAnalysis, null, 2))
  });

  const brain = output!;

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
    const summaries: { topic: string; summary: z.infer<typeof topicSummarySchema> }[] = [];
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
