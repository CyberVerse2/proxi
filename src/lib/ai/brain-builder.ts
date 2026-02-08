/**
 * Topic-clustered brain building.
 *
 * Instead of dumping 300 tweets into one prompt, we:
 *   1. Cluster tweets by topic (lightweight Claude call)
 *   2. Build per-topic summaries with beliefs, opinions, and knowledge
 *   3. Synthesize the final brain from per-topic summaries
 *
 * This gives richer topic coverage and prevents the "loudest topic eats the token budget" problem.
 */

import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { extractJSON } from "./parse-json";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface CoreBrain {
  beliefs: string[];
  opinions: Record<string, string>;
  topicMap: Record<string, string[]>;
  faq: { question: string; answer: string }[];
  personality: string;
  background: string;
}

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

Output ONLY valid JSON — no preamble, no explanation — an array of topic clusters:
[
  { "topic": "Topic Name", "tweetIndices": [0, 3, 7, 12] },
  { "topic": "Another Topic", "tweetIndices": [1, 4, 5] }
]

Rules:
- Use clear, descriptive topic names (e.g. "AI & Technology", "Crypto Markets", "Personal Life").
- Aim for 6–12 clusters. Fewer is fine if the person has a narrow focus. Merge tiny clusters (<3 posts) into "General / Miscellaneous" rather than forcing a category.
- Every post index from 0 to the last post MUST appear in exactly one cluster. Do NOT skip any index.
- After building your clusters, mentally verify no index is missing or duplicated.
- Do NOT include any text outside the JSON array.`;

const TOPIC_SUMMARY_PROMPT = `You are building a detailed summary of a person's beliefs, opinions, and knowledge on a specific topic. Only extract what is clearly expressed or strongly implied in the posts — do NOT fill in gaps with assumptions.

Topic: {TOPIC}

Their posts on this topic:
<posts>
{POSTS}
</posts>

Output ONLY valid JSON — no preamble, no explanation:
{
  "beliefs": ["3-8 core beliefs they hold on this topic, each specific and testable"],
  "opinions": { "subtopic": "their specific stance, using their own words where possible" },
  "knowledge": ["key facts, insights, or expertise they demonstrate — things they clearly know about"],
  "faq": [{ "question": "likely question someone would ask about this topic", "answer": "how this person would answer IN THEIR VOICE AND STYLE — not a generic answer" }]
}

Rules:
- Beliefs must be specific. NOT "they care about technology." YES "they believe open-source AI will outperform closed models within 5 years."
- FAQ answers should sound like the person wrote them, not like an encyclopedia.
- Include 2-5 items per field. Quality over quantity.`;

const SYNTHESIS_PROMPT = `You are synthesizing a comprehensive "Core Brain" for an AI clone. This brain will be used to make an AI respond as this specific person. It must be vivid, specific, and deeply faithful to the source material.

<voice_profile>
{VOICE}
</voice_profile>

<topic_summaries>
{SUMMARIES}
</topic_summaries>

Output ONLY valid JSON — no preamble, no explanation:
{
  "beliefs": ["8-15 core beliefs and values, synthesized across all topics"],
  "opinions": { "topic/subtopic": "their specific stance" },
  "topicMap": { "category": ["subtopics they frequently discuss"] },
  "faq": [{ "question": "common question", "answer": "how they'd answer in their exact voice" }],
  "personality": "2-3 paragraph personality summary",
  "background": "inferred background, expertise, and bio"
}

Hard constraints (MUST follow):
- opinions MUST include at least one entry per topic summary provided above. Do not skip smaller topics.
- beliefs MUST be specific and testable. BAD: "values hard work." GOOD: "believes that shipping fast and iterating beats planning for months."
- background MUST be inferred from evidence in the posts, not invented.
- Do NOT include any text outside the JSON.

Soft constraints (SHOULD follow):
- personality should read like a character bible for an actor — vivid, specific, full of "this person would" and "this person never." BAD: "They are passionate about technology." GOOD: "They treat every new AI model release like a sporting event, live-tweeting their benchmarks with the energy of a commentator calling a championship game."
- faq should have 8-15 entries spanning different topics. Answers should sound like the person wrote them — match their tone, length, and vocabulary from the voice profile.

After generating the JSON, mentally verify that every topic from the summaries is represented in the opinions field.`;

/* ------------------------------------------------------------------ */
/*  Implementation                                                     */
/* ------------------------------------------------------------------ */

const model = anthropic("claude-sonnet-4-20250514");

/**
 * Phase 1: Cluster tweets into topic groups.
 */
export async function clusterByTopic(
  posts: string[],
): Promise<TopicCluster[]> {
  // Number each post so the LLM can reference by index
  const numbered = posts.map((p, i) => `[${i}] ${p}`).join("\n---\n");

  const { text } = await generateText({
    model,
    maxOutputTokens: 4000,
    prompt: CLUSTER_PROMPT.replace("{POSTS}", numbered),
  });

  return extractJSON<TopicCluster[]>(text);
}

/**
 * Phase 2: Build a summary for a single topic cluster.
 */
async function buildTopicSummary(
  topic: string,
  posts: string[],
): Promise<Record<string, unknown>> {
  const sample = posts.join("\n---\n");

  const { text } = await generateText({
    model,
    maxOutputTokens: 2000,
    prompt: TOPIC_SUMMARY_PROMPT.replace("{TOPIC}", topic).replace("{POSTS}", sample),
  });

  return extractJSON<Record<string, unknown>>(text);
}

/**
 * Phase 3: Synthesize the final brain from all topic summaries.
 */
async function synthesizeBrain(
  topicSummaries: { topic: string; summary: Record<string, unknown> }[],
  voiceProfile: Record<string, unknown>,
): Promise<CoreBrain> {
  const summariesStr = topicSummaries
    .map((ts) => `### ${ts.topic}\n${JSON.stringify(ts.summary, null, 2)}`)
    .join("\n\n");

  const topicNames = topicSummaries.map((ts) => ts.topic);

  const { text } = await generateText({
    model,
    maxOutputTokens: 5000,
    prompt: SYNTHESIS_PROMPT.replace("{VOICE}", JSON.stringify(voiceProfile, null, 2))
      .replace("{SUMMARIES}", summariesStr),
  });

  const brain = extractJSON<CoreBrain>(text);

  // Verification step (from chain-of-thought.md): ensure topic coverage
  if (brain.opinions) {
    const coveredTopics = Object.keys(brain.opinions);
    const missing = topicNames.filter(
      (t) => !coveredTopics.some((ct) => ct.toLowerCase().includes(t.toLowerCase().split(" ")[0])),
    );
    if (missing.length > 0) {
      console.warn(
        `[brain-builder] Synthesis missed topics in opinions: ${missing.join(", ")}. ` +
        `Covered: ${coveredTopics.join(", ")}`,
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
  voiceProfile: Record<string, unknown>,
): Promise<CoreBrain> {
  const postSample = posts.slice(0, 300);

  // Phase 1: Cluster
  const clusters = await clusterByTopic(postSample);

  // Phase 2: Per-topic summaries (run in parallel, max 4 at a time)
  const topicSummaries: { topic: string; summary: Record<string, unknown> }[] = [];
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
      }),
    );
    for (const r of results) {
      if (r) topicSummaries.push(r);
    }
  }

  // Phase 3: Synthesize
  return synthesizeBrain(topicSummaries, voiceProfile);
}
