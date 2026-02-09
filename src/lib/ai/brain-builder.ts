/**
 * Topic-clustered brain building.
 *
 * Instead of dumping 300 tweets into one prompt, we:
 *   1.   Cluster tweets by topic (lightweight Claude call)
 *   2.   Build per-topic summaries with beliefs, opinions, knowledge, and reasoning patterns
 *   2.5  Analyze reasoning style, emotional triggers, contradictions, and blind spots
 *        (runs in parallel with step 2 — independent of topic clusters)
 *   3.   Synthesize the full CoreBrain from topic summaries + reasoning analysis
 *
 * This gives richer topic coverage, prevents the "loudest topic eats the token budget" problem,
 * and captures HOW the person thinks — not just WHAT they think.
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
  reasoningStyle: string;
  emotionalTriggers: Record<string, string>;
  blindSpots: string[];
  contradictions: string[];
  vocabularyFingerprint: string[];
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

const TOPIC_SUMMARY_PROMPT = `You are building a detailed summary of a person's beliefs, opinions, knowledge, and reasoning on a specific topic. Only extract what is clearly expressed or strongly implied in the posts — do NOT fill in gaps with assumptions.

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
  "faq": [{ "question": "likely question someone would ask about this topic", "answer": "how this person would answer IN THEIR VOICE AND STYLE — not a generic answer" }],
  "reasoningPatterns": ["how they argue, persuade, or explain on this topic — do they use data? analogies? personal anecdotes? first principles? appeals to authority? hypotheticals?"],
  "emotionalReactions": { "trigger": "how they react — what makes them excited, sarcastic, frustrated, passionate, or dismissive on this topic" }
}

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

Output ONLY valid JSON — no preamble, no explanation:
{
  "beliefs": ["8-15 core beliefs and values, synthesized across all topics"],
  "opinions": { "topic/subtopic": "their specific stance" },
  "topicMap": { "category": ["subtopics they frequently discuss"] },
  "faq": [{ "question": "common question", "answer": "how they'd answer in their exact voice" }],
  "personality": "2-3 paragraph personality summary",
  "background": "inferred background, expertise, and bio",
  "reasoningStyle": "2-3 paragraphs on HOW they think — their argumentative approach, how they handle disagreement, how they weigh evidence, whether they reason from first principles or analogy, how they deal with uncertainty. Synthesize from both topic-level reasoning patterns and the holistic reasoning analysis.",
  "emotionalTriggers": { "trigger_category": "what provokes this reaction and how it shows up in their communication — be specific and vivid" },
  "blindSpots": ["topics they avoid, perspectives they never engage with, biases they display without awareness"],
  "contradictions": ["specific tensions between their stated beliefs or behaviors — stated without judgment, as human complexity"],
  "vocabularyFingerprint": ["distinctive phrases, recurring metaphors, coined terms, verbal tics unique to this person"]
}

Hard constraints (MUST follow):
- opinions MUST include at least one entry per topic summary provided above. Do not skip smaller topics.
- beliefs MUST be specific and testable. BAD: "values hard work." GOOD: "believes that shipping fast and iterating beats planning for months."
- background MUST be inferred from evidence in the posts, not invented.
- reasoningStyle MUST describe process, not conclusions. Two people can hold the same belief but arrive there differently.
- contradictions MUST be genuine tensions found in the source material, not invented for color.
- Do NOT include any text outside the JSON.

Soft constraints (SHOULD follow):
- personality should read like a character bible for an actor — vivid, specific, full of "this person would" and "this person never." BAD: "They are passionate about technology." GOOD: "They treat every new AI model release like a sporting event, live-tweeting their benchmarks with the energy of a commentator calling a championship game."
- faq should have 8-15 entries spanning different topics. Answers should sound like the person wrote them — match their tone, length, and vocabulary from the voice profile.
- emotionalTriggers should have 3-6 entries. Each should feel like a cheat sheet for an actor: "when X happens, they do Y."
- blindSpots and contradictions are features, not bugs. Include 2-5 each if the evidence supports it. If not, include fewer — don't fabricate.
- vocabularyFingerprint should be 5-15 items. Only include language distinctive enough to identify this person in a blind lineup.

After generating the JSON, mentally verify that every topic from the summaries is represented in the opinions field.`;

const REASONING_PROMPT = `You are analyzing how a specific person THINKS — not what they think, but HOW they think. Focus on their reasoning patterns, emotional wiring, contradictions, and blind spots.

<posts>
{POSTS}
</posts>

These posts were selected because they contain argumentation, explanation, debate, or strong emotional reactions. Analyze them to extract the person's cognitive and emotional fingerprint.

Output ONLY valid JSON — no preamble, no explanation:
{
  "reasoningStyle": "2-3 paragraph description of how this person reasons. Do they argue from first principles or by analogy? Do they rely on data, lived experience, authority, or intuition? How do they handle uncertainty — do they hedge or commit? How do they respond to disagreement — do they steelman or strawman? Do they change their mind publicly or dig in? Write this like a psychologist's case note, not a horoscope.",
  "emotionalTriggers": {
    "excitement": "what topics, events, or ideas make them light up — and how does it show in their writing?",
    "frustration": "what triggers irritation or anger — and how does it manifest? (sarcasm, rants, dismissiveness, etc.)",
    "passion": "what do they care about so deeply they can't help themselves — even when nobody asked?",
    "humor": "what do they find funny? is it deadpan, absurdist, self-deprecating, roast-style, or situational?"
  },
  "blindSpots": ["topics they conspicuously avoid despite being adjacent to their interests", "biases they show without seeming aware of them", "perspectives they never engage with"],
  "contradictions": ["places where their stated beliefs or behaviors conflict with each other — e.g. they preach patience but clearly get frustrated fast, or they say they don't care about metrics but celebrate follower counts"],
  "vocabularyFingerprint": ["distinctive phrases, recurring metaphors, invented terms, or verbal tics that are uniquely theirs — not generic slang everyone uses, but language that would let you identify this person in a blind lineup"]
}

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
 * Phase 2.5: Analyze reasoning style, emotional patterns, and contradictions.
 * Runs on posts that show argumentation, explanation, or strong emotion.
 */
interface ReasoningAnalysis {
  reasoningStyle: string;
  emotionalTriggers: Record<string, string>;
  blindSpots: string[];
  contradictions: string[];
  vocabularyFingerprint: string[];
}

async function analyzeReasoningStyle(
  posts: string[],
): Promise<ReasoningAnalysis> {
  // Select posts that are likely argumentative, explanatory, or emotionally charged.
  // Heuristics: longer posts, posts with debate markers, posts with strong sentiment words.
  const argumentativeMarkers = [
    "because", "therefore", "however", "actually", "disagree", "wrong",
    "the problem", "here's why", "hot take", "unpopular opinion", "thread",
    "let me explain", "people don't realize", "the truth is", "imo",
    "counterpoint", "but", "on the other hand", "i think", "honestly",
    "this is why", "the issue", "frustrated", "love this", "hate this",
    "insane", "ridiculous", "underrated", "overrated", "nobody talks about",
    "?", "!", "...",
  ];

  const scoredPosts = posts.map((post) => {
    const lower = post.toLowerCase();
    let score = 0;
    // Length bonus — longer posts more likely to contain reasoning
    if (post.length > 150) score += 2;
    if (post.length > 300) score += 2;
    // Marker matches
    for (const marker of argumentativeMarkers) {
      if (lower.includes(marker)) score += 1;
    }
    return { post, score };
  });

  // Take top 80 posts by "argumentativeness" score
  scoredPosts.sort((a, b) => b.score - a.score);
  const selected = scoredPosts.slice(0, 80).map((s) => s.post);

  if (selected.length < 5) {
    // Not enough signal — return minimal defaults
    return {
      reasoningStyle: "Not enough argumentative or explanatory posts to determine a clear reasoning style.",
      emotionalTriggers: {},
      blindSpots: [],
      contradictions: [],
      vocabularyFingerprint: [],
    };
  }

  const numbered = selected.map((p, i) => `[${i}] ${p}`).join("\n---\n");

  const { text } = await generateText({
    model,
    maxOutputTokens: 4000,
    prompt: REASONING_PROMPT.replace("{POSTS}", numbered),
  });

  return extractJSON<ReasoningAnalysis>(text);
}

/**
 * Phase 3: Synthesize the final brain from all topic summaries.
 */
async function synthesizeBrain(
  topicSummaries: { topic: string; summary: Record<string, unknown> }[],
  voiceProfile: Record<string, unknown>,
  reasoningAnalysis: ReasoningAnalysis,
): Promise<CoreBrain> {
  const summariesStr = topicSummaries
    .map((ts) => `### ${ts.topic}\n${JSON.stringify(ts.summary, null, 2)}`)
    .join("\n\n");

  const topicNames = topicSummaries.map((ts) => ts.topic);

  const { text } = await generateText({
    model,
    maxOutputTokens: 8000,
    prompt: SYNTHESIS_PROMPT.replace("{VOICE}", JSON.stringify(voiceProfile, null, 2))
      .replace("{SUMMARIES}", summariesStr)
      .replace("{REASONING}", JSON.stringify(reasoningAnalysis, null, 2)),
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

  // Phase 2 + 2.5: Run topic summaries and reasoning analysis in parallel.
  // The reasoning analysis doesn't depend on clusters — it works on all posts.
  const topicSummariesPromise = (async () => {
    const summaries: { topic: string; summary: Record<string, unknown> }[] = [];
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
        if (r) summaries.push(r);
      }
    }
    return summaries;
  })();

  const reasoningPromise = analyzeReasoningStyle(postSample);

  const [topicSummaries, reasoningAnalysis] = await Promise.all([
    topicSummariesPromise,
    reasoningPromise,
  ]);

  // Phase 3: Synthesize (now includes reasoning analysis)
  return synthesizeBrain(topicSummaries, voiceProfile, reasoningAnalysis);
}
