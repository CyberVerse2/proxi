/**
 * Selects representative writing examples across different tones/topics.
 * These are injected as few-shot examples in the chat prompt so the model
 * can *see* how the person actually writes, not just read a JSON description.
 *
 * Uses `generateObject` with a Zod schema for guaranteed valid JSON.
 */

import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { generateStructured } from "./structured";

const writingExampleSchema = z.object({
  category: z.string().describe("One of: being funny, being serious, giving advice, hot take, storytelling, technical, celebrating, frustrated, casual, motivational"),
  text: z.string().describe("EXACT verbatim tweet text — copied character-for-character, no paraphrasing"),
});

export type WritingExample = z.infer<typeof writingExampleSchema>;

const SELECT_PROMPT = `You are selecting the most representative writing samples from a person's posts. Pick 12-15 examples that showcase DIFFERENT aspects of how this person writes. These will be used as few-shot examples for an AI to mimic their voice, so quality and diversity matter enormously.

Categories (pick 1-2 per category, skip categories that have no clear examples):
- "being funny" — jokes, humor, witty observations
- "being serious" — thoughtful analysis, deep commentary
- "giving advice" — recommendations, guidance, lessons
- "hot take" — provocative opinions, controversial stances
- "storytelling" — personal anecdotes, narratives
- "technical" — domain expertise, specific knowledge
- "celebrating" — congratulations, excitement, hype
- "frustrated" — complaints, criticism, pushback
- "casual" — everyday banter, low-effort but characteristic
- "motivational" — inspiring, encouraging

<posts>
{POSTS}
</posts>

Rules:
- VERBATIM COPY-PASTE ONLY. Copy the exact original text character-for-character. Do not paraphrase, clean up, fix typos, or edit in any way. Even minor changes are unacceptable.
- Prefer posts that are distinctive and memorable over generic ones. Pick posts where you think "that's SO them."
- Do NOT select two posts that say essentially the same thing. Maximize diversity.
- Skip categories where no good representative example exists — do NOT force-fit.`;

export async function selectWritingExamples(
  posts: string[],
): Promise<WritingExample[]> {
  const sample = posts.slice(0, 200).join("\n---\n");

  const result = await generateStructured({
    model: anthropic("claude-sonnet-4-20250514"),
    schema: z.object({
      examples: z.array(writingExampleSchema).describe("12-15 representative writing examples across different categories"),
    }),
    maxOutputTokens: 3000,
    prompt: SELECT_PROMPT.replace("{POSTS}", sample),
  });

  return result.examples;
}
