/**
 * Selects representative writing examples across different tones/topics.
 * These are injected as few-shot examples in the chat prompt so the model
 * can *see* how the person actually writes, not just read a JSON description.
 */

import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { extractJSON } from "./parse-json";

export interface WritingExample {
  category: string;
  text: string;
}

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
- Skip categories where no good representative example exists — do NOT force-fit.

Output ONLY a JSON array — no preamble, no explanation:
[
  { "category": "being funny", "text": "exact verbatim tweet text" },
  { "category": "hot take", "text": "exact verbatim tweet text" }
]`;

export async function selectWritingExamples(
  posts: string[],
): Promise<WritingExample[]> {
  const sample = posts.slice(0, 200).join("\n---\n");

  const { text } = await generateText({
    model: anthropic("claude-sonnet-4-20250514"),
    maxOutputTokens: 3000,
    prompt: SELECT_PROMPT.replace("{POSTS}", sample),
  });

  return extractJSON<WritingExample[]>(text);
}
