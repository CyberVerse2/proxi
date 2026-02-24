/**
 * Multi-pass voice analysis with structured outputs.
 *
 * Instead of one giant prompt, we run three focused passes:
 *   Pass 1 — Style Extraction: linguistic patterns, punctuation, structure
 *   Pass 2 — Tone Mapping: how the voice shifts by context
 *   Pass 3 — Signature Patterns: catchphrases, rhetorical fingerprint
 *
 * All calls use `generateObject` with Zod schemas for guaranteed valid JSON.
 */

import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { generateStructured } from "./structured";

/* ------------------------------------------------------------------ */
/*  Schemas                                                            */
/* ------------------------------------------------------------------ */

const styleSchema = z.object({
  tone: z.string().describe("Overall writing tone in 1-2 sentences, with specific evidence").default("not observed"),
  vocabulary: z.array(z.string()).describe("Characteristic words/phrases they use repeatedly — only include words seen at least 3 times").default([]),
  sentencePatterns: z.array(z.string()).describe("Pattern descriptions with at least one example per pattern").default([]),
  punctuationHabits: z.array(z.string()).describe("Observed punctuation habits — only include habits seen multiple times").default([]),
  capitalizationStyle: z.string().describe("e.g. 'all lowercase', 'sentence case', 'random ALL CAPS for emphasis'").default("not observed"),
  emojiUsage: z.string().describe("Frequency and types of emoji use, or 'not observed' if absent").default("not observed"),
});

const toneMapSchema = z.object({
  emotionalRange: z.string().describe("Spectrum of emotions visible in their writing, citing specific shifts").default("not observed"),
  humorStyle: z.string().describe("How they use humor — sarcasm, absurdism, self-deprecation, etc. 'not observed' if rare").default("not observed"),
  toneMap: z.object({
    humor: z.string().describe("How they write when being funny, or 'not observed'").default("not observed"),
    serious: z.string().describe("How they write in serious/analytical mode, or 'not observed'").default("not observed"),
    excited: z.string().describe("How they write when hyped or celebrating, or 'not observed'").default("not observed"),
    frustrated: z.string().describe("How they write when annoyed or angry, or 'not observed'").default("not observed"),
    technical: z.string().describe("How they write about domain expertise, or 'not observed'").default("not observed"),
    casual: z.string().describe("How they write in low-stakes everyday conversation, or 'not observed'").default("not observed"),
  }).default({
    humor: "not observed",
    serious: "not observed",
    excited: "not observed",
    frustrated: "not observed",
    technical: "not observed",
    casual: "not observed",
  }),
});

const signatureSchema = z.object({
  catchphrases: z.array(z.string()).describe("Recurring multi-word phrases or expressions they use 3+ times — quoted exactly").default([]),
  openers: z.array(z.string()).describe("How they typically start posts — only patterns seen multiple times").default([]),
  closers: z.array(z.string()).describe("How they typically end posts — only patterns seen multiple times").default([]),
  rhetoricalDevices: z.array(z.string()).describe("e.g. 'lists of three', 'builds to a punchline', 'asks then answers own question'").default([]),
  uniqueTraits: z.array(z.string()).describe("Any other distinctive quirks — made-up words, formatting, abbreviations").default([]),
  topicPreferences: z.array(z.string()).describe("Ordered list of 5-10 most discussed topics").default([]),
  communicationStyle: z.string().describe("1-2 sentence summary of their overall communication approach").default("not observed"),
});

/* ------------------------------------------------------------------ */
/*  Exported type                                                      */
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
- If a field has no clear signal (e.g. the person never uses emoji), write "not observed" instead of guessing.`;

const TONE_MAP_PROMPT = `You are mapping how a person's writing voice SHIFTS depending on context. For each context below, describe specific changes in tone, word choice, and sentence structure — with concrete examples from the posts.

<posts>
{POSTS}
</posts>

Rules:
- Ground every observation in real examples from the posts. Do NOT speculate.
- If a context has no clear examples in the data (e.g. no frustrated posts), write "not observed — insufficient data" for that context.`;

const SIGNATURE_PROMPT = `You are identifying the "fingerprint" patterns that make this person's writing instantly recognizable. Find their signature moves — recurring, distinctive patterns that appear multiple times.

<posts>
{POSTS}
</posts>

Rules:
- Only include patterns backed by at least 2-3 real examples in the data. Quality over quantity.
- "catchphrases" means multi-word phrases or expressions, NOT single common words.
- If a field has no clear examples, return an empty array instead of guessing.`;

/* ------------------------------------------------------------------ */
/*  Implementation                                                     */
/* ------------------------------------------------------------------ */

const model = anthropic("claude-sonnet-4-20250514");

export async function analyzeVoice(posts: string[]): Promise<VoiceProfile> {
  // Token guard: cap at ~300 posts
  const sample = posts.slice(0, 300).join("\n---\n");

  // Run all three passes in parallel for speed
  const [s, t, sig] = await Promise.all([
    generateStructured({
      model,
      schema: styleSchema,
      maxOutputTokens: 2000,
      prompt: STYLE_PROMPT.replace("{POSTS}", sample),
    }),
    generateStructured({
      model,
      schema: toneMapSchema,
      maxOutputTokens: 2000,
      prompt: TONE_MAP_PROMPT.replace("{POSTS}", sample),
    }),
    generateStructured({
      model,
      schema: signatureSchema,
      maxOutputTokens: 2000,
      prompt: SIGNATURE_PROMPT.replace("{POSTS}", sample),
    }),
  ]);

  return {
    // Style
    tone: s.tone,
    vocabulary: s.vocabulary,
    sentencePatterns: s.sentencePatterns,
    punctuationHabits: s.punctuationHabits,
    capitalizationStyle: s.capitalizationStyle,
    emojiUsage: s.emojiUsage,

    // Tone Map
    emotionalRange: t.emotionalRange,
    humorStyle: t.humorStyle,
    toneMap: t.toneMap,

    // Signature
    catchphrases: sig.catchphrases,
    openers: sig.openers,
    closers: sig.closers,
    rhetoricalDevices: sig.rhetoricalDevices,
    uniqueTraits: sig.uniqueTraits,
    topicPreferences: sig.topicPreferences,
    communicationStyle: sig.communicationStyle,
  };
}
