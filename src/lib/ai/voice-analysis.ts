/**
 * Multi-pass voice analysis.
 *
 * Instead of one giant prompt, we run three focused passes:
 *   Pass 1 — Style Extraction: linguistic patterns, punctuation, structure
 *   Pass 2 — Tone Mapping: how the voice shifts by context
 *   Pass 3 — Signature Patterns: catchphrases, rhetorical fingerprint
 *
 * The results are merged into a single rich VoiceProfile.
 */

import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { extractJSON } from "./parse-json";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface VoiceProfile {
  /* Pass 1 – Style */
  tone: string;
  vocabulary: string[];
  sentencePatterns: string[];
  punctuationHabits: string[];
  capitalizationStyle: string;
  emojiUsage: string;

  /* Pass 2 – Tone Map */
  emotionalRange: string;
  humorStyle: string;
  toneMap: Record<string, string>;

  /* Pass 3 – Signature */
  catchphrases: string[];
  openers: string[];
  closers: string[];
  rhetoricalDevices: string[];
  uniqueTraits: string[];

  /* Meta */
  topicPreferences: string[];
  communicationStyle: string;
}

/* ------------------------------------------------------------------ */
/*  Prompts                                                            */
/* ------------------------------------------------------------------ */

const STYLE_PROMPT = `You are a computational linguist performing a rigorous stylistic analysis. Analyze the following posts and extract ONLY stylistic and structural writing patterns. Completely ignore the topics — focus exclusively on HOW they write.

<posts>
{POSTS}
</posts>

Rules:
- Every pattern you report MUST be backed by multiple examples in the data. Do NOT invent patterns.
- If a field has no clear signal (e.g. the person never uses emoji), write "not observed" instead of guessing.
- Do NOT include any text outside the JSON — no preamble, no explanation. Output raw JSON only.

{
  "tone": "overall writing tone in 1–2 sentences, with specific evidence",
  "vocabulary": ["characteristic words and phrases they use repeatedly — only include words/phrases you saw at least 3 times"],
  "sentencePatterns": ["pattern descriptions — e.g. 'short punchy fragments', 'stacked rhetorical questions'. Cite at least one example per pattern."],
  "punctuationHabits": ["e.g. 'heavy ellipsis usage', 'no periods on short tweets', 'em-dashes instead of commas'. Only include habits you observed multiple times."],
  "capitalizationStyle": "e.g. 'all lowercase', 'sentence case', 'random ALL CAPS for emphasis'",
  "emojiUsage": "describe frequency and types of emoji / emoticon use, or 'not observed' if absent"
}`;

const TONE_MAP_PROMPT = `You are mapping how a person's writing voice SHIFTS depending on context. For each context below, describe specific changes in tone, word choice, and sentence structure — with concrete examples from the posts.

<posts>
{POSTS}
</posts>

Rules:
- Ground every observation in real examples from the posts. Do NOT speculate.
- If a context has no clear examples in the data (e.g. no frustrated posts), write "not observed — insufficient data" for that context.
- Do NOT include any text outside the JSON. Output raw JSON only.

{
  "emotionalRange": "describe the spectrum of emotions actually visible in their writing, citing specific shifts",
  "humorStyle": "how they use humor — sarcasm, absurdism, self-deprecation, wit, etc. Write 'not observed' if they rarely use humor.",
  "toneMap": {
    "humor": "how they write when being funny, or 'not observed'",
    "serious": "how they write in serious / analytical mode, or 'not observed'",
    "excited": "how they write when hyped or celebrating, or 'not observed'",
    "frustrated": "how they write when annoyed or angry, or 'not observed'",
    "technical": "how they write about domain expertise, or 'not observed'",
    "casual": "how they write in low-stakes, everyday conversation, or 'not observed'"
  }
}`;

const SIGNATURE_PROMPT = `You are identifying the "fingerprint" patterns that make this person's writing instantly recognizable. Find their signature moves — recurring, distinctive patterns that appear multiple times.

<posts>
{POSTS}
</posts>

Rules:
- Only include patterns backed by at least 2-3 real examples in the data. Quality over quantity.
- "catchphrases" means multi-word phrases or expressions, NOT single common words.
- If a field has no clear examples, return an empty array [] instead of guessing.
- Do NOT include any text outside the JSON. Output raw JSON only.

{
  "catchphrases": ["recurring multi-word phrases or expressions they use 3+ times — quote them exactly as written"],
  "openers": ["how they typically start posts — e.g. 'Thread:', 'Hot take:', 'Okay so'. Only include patterns seen multiple times."],
  "closers": ["how they typically end posts — e.g. 'thoughts?', 'iykyk', trailing '...'. Only include patterns seen multiple times."],
  "rhetoricalDevices": ["e.g. 'lists of three', 'builds to a punchline', 'asks then answers own question'"],
  "uniqueTraits": ["any other distinctive quirks — made-up words, specific formatting, abbreviations, etc."],
  "topicPreferences": ["ordered list of the 5-10 topics they discuss most, from most to least frequent"],
  "communicationStyle": "1-2 sentence summary of their overall communication approach, grounded in observed patterns"
}`;

/* ------------------------------------------------------------------ */
/*  Implementation                                                     */
/* ------------------------------------------------------------------ */

const model = anthropic("claude-sonnet-4-20250514");

async function runPass<T>(prompt: string, posts: string[]): Promise<T> {
  // Token guard: cap at ~300 posts to stay within context limits
  const sample = posts.slice(0, 300).join("\n---\n");

  const { text } = await generateText({
    model,
    maxOutputTokens: 2000,
    prompt: prompt.replace("{POSTS}", sample),
  });

  return extractJSON<T>(text);
}

export async function analyzeVoice(posts: string[]): Promise<VoiceProfile> {
  // Run all three passes in parallel for speed
  const [style, toneMap, signature] = await Promise.all([
    runPass<{
      tone: string;
      vocabulary: string[];
      sentencePatterns: string[];
      punctuationHabits: string[];
      capitalizationStyle: string;
      emojiUsage: string;
    }>(STYLE_PROMPT, posts),

    runPass<{
      emotionalRange: string;
      humorStyle: string;
      toneMap: Record<string, string>;
    }>(TONE_MAP_PROMPT, posts),

    runPass<{
      catchphrases: string[];
      openers: string[];
      closers: string[];
      rhetoricalDevices: string[];
      uniqueTraits: string[];
      topicPreferences: string[];
      communicationStyle: string;
    }>(SIGNATURE_PROMPT, posts),
  ]);

  return {
    // Style
    tone: style.tone,
    vocabulary: style.vocabulary,
    sentencePatterns: style.sentencePatterns,
    punctuationHabits: style.punctuationHabits,
    capitalizationStyle: style.capitalizationStyle,
    emojiUsage: style.emojiUsage,

    // Tone Map
    emotionalRange: toneMap.emotionalRange,
    humorStyle: toneMap.humorStyle,
    toneMap: toneMap.toneMap,

    // Signature
    catchphrases: signature.catchphrases,
    openers: signature.openers,
    closers: signature.closers,
    rhetoricalDevices: signature.rhetoricalDevices,
    uniqueTraits: signature.uniqueTraits,
    topicPreferences: signature.topicPreferences,
    communicationStyle: signature.communicationStyle,
  };
}
