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

import { generateText, Output } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";

/* ------------------------------------------------------------------ */
/*  Schemas                                                            */
/* ------------------------------------------------------------------ */

const styleSchema = z.object({
  tone: z.string().describe("Overall writing tone in 1-2 sentences, with specific evidence"),
  vocabulary: z.array(z.string()).describe("Characteristic words/phrases they use repeatedly — only include words seen at least 3 times"),
  sentencePatterns: z.array(z.string()).describe("Pattern descriptions with at least one example per pattern"),
  punctuationHabits: z.array(z.string()).describe("Observed punctuation habits — only include habits seen multiple times"),
  capitalizationStyle: z.string().describe("e.g. 'all lowercase', 'sentence case', 'random ALL CAPS for emphasis'"),
  emojiUsage: z.string().describe("Frequency and types of emoji use, or 'not observed' if absent"),
});

const toneMapSchema = z.object({
  emotionalRange: z.string().describe("Spectrum of emotions visible in their writing, citing specific shifts"),
  humorStyle: z.string().describe("How they use humor — sarcasm, absurdism, self-deprecation, etc. 'not observed' if rare"),
  toneMap: z.object({
    humor: z.string().describe("How they write when being funny, or 'not observed'"),
    serious: z.string().describe("How they write in serious/analytical mode, or 'not observed'"),
    excited: z.string().describe("How they write when hyped or celebrating, or 'not observed'"),
    frustrated: z.string().describe("How they write when annoyed or angry, or 'not observed'"),
    technical: z.string().describe("How they write about domain expertise, or 'not observed'"),
    casual: z.string().describe("How they write in low-stakes everyday conversation, or 'not observed'"),
  }),
});

const signatureSchema = z.object({
  catchphrases: z.array(z.string()).describe("Recurring multi-word phrases or expressions they use 3+ times — quoted exactly"),
  openers: z.array(z.string()).describe("How they typically start posts — only patterns seen multiple times"),
  closers: z.array(z.string()).describe("How they typically end posts — only patterns seen multiple times"),
  rhetoricalDevices: z.array(z.string()).describe("e.g. 'lists of three', 'builds to a punchline', 'asks then answers own question'"),
  uniqueTraits: z.array(z.string()).describe("Any other distinctive quirks — made-up words, formatting, abbreviations"),
  topicPreferences: z.array(z.string()).describe("Ordered list of 5-10 most discussed topics"),
  communicationStyle: z.string().describe("1-2 sentence summary of their overall communication approach"),
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
  const [style, toneMapResult, signature] = await Promise.all([
    generateText({
      model,
      output: Output.object({ schema: styleSchema }),
      maxOutputTokens: 2000,
      prompt: STYLE_PROMPT.replace("{POSTS}", sample),
    }),
    generateText({
      model,
      output: Output.object({ schema: toneMapSchema }),
      maxOutputTokens: 2000,
      prompt: TONE_MAP_PROMPT.replace("{POSTS}", sample),
    }),
    generateText({
      model,
      output: Output.object({ schema: signatureSchema }),
      maxOutputTokens: 2000,
      prompt: SIGNATURE_PROMPT.replace("{POSTS}", sample),
    }),
  ]);

  const s = style.output!;
  const t = toneMapResult.output!;
  const sig = signature.output!;

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
