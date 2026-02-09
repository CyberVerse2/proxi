/**
 * AI-powered proxy category classifier.
 *
 * Given a user's bio, follower count, and brain topics, classifies
 * the proxy into one of the predefined categories.
 */

import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { generateStructured } from "./structured";

const model = anthropic("claude-sonnet-4-20250514");

const CATEGORY_SLUGS = [
  "top-creators",
  "founders",
  "influencers",
  "traders",
  "investors",
  "ui-ux-design",
  "athletes",
  "solana",
  "musicians",
] as const;

const classificationSchema = z.object({
  category: z.enum(CATEGORY_SLUGS).describe(
    "The single best-fit category slug for this person"
  ),
  confidence: z.number().min(0).max(1).describe(
    "Confidence score between 0 and 1"
  ),
  reasoning: z.string().describe(
    "Brief explanation of why this category was chosen"
  ),
});

export type ClassificationResult = z.infer<typeof classificationSchema>;

const CLASSIFY_PROMPT = `You are classifying a person into exactly ONE category based on their X (Twitter) profile.

## Available categories:
- **top-creators**: Major content creators with large audiences (10k+ followers). These are people primarily known for creating content, not fitting other specific categories.
- **founders**: Startup founders, CEOs, co-founders of companies, or entrepreneurs building products/companies.
- **influencers**: Social media personalities, thought leaders, commentators who shape opinions. Distinct from top-creators in that they're more about influence than content creation.
- **traders**: Active traders (crypto, stocks, forex). They talk about trades, charts, technical analysis, positions, PnL.
- **investors**: VCs, angel investors, fund managers. They talk about portfolios, investments, market thesis, due diligence — distinct from traders (long-term vs short-term).
- **ui-ux-design**: Designers, UI/UX professionals, product designers, people who share design work, Figma, design systems, user experience.
- **athletes**: Professional or amateur athletes, sports personalities, fitness influencers focused on athletic performance.
- **solana**: People deeply embedded in the Solana ecosystem — Solana developers, Solana project founders, Solana community members who primarily talk about Solana.
- **musicians**: Musicians, producers, DJs, artists in the music industry.

## Rules:
1. If the person has 10,000+ followers AND doesn't clearly fit another specific category, use "top-creators".
2. If the person clearly fits a specific category (e.g., they're a founder, trader, designer), use that category even if they have lots of followers.
3. Choose the SINGLE most dominant category. Everyone has multiple facets — pick the primary one.
4. "solana" is for people whose identity is tied to Solana specifically, not just anyone who mentions crypto.

## Person's profile:
- **Bio**: {BIO}
- **Followers**: {FOLLOWERS}
- **Topics they discuss**: {TOPICS}

Classify this person into exactly one category.`;

/**
 * Classify a proxy into a category using AI analysis of their profile.
 */
export async function classifyProxy(opts: {
  bio: string | null;
  followerCount: number;
  topics: string[];
}): Promise<ClassificationResult> {
  const prompt = CLASSIFY_PROMPT
    .replace("{BIO}", opts.bio || "No bio available")
    .replace("{FOLLOWERS}", opts.followerCount.toLocaleString())
    .replace("{TOPICS}", opts.topics.length > 0 ? opts.topics.join(", ") : "Unknown");

  return generateStructured({
    model,
    schema: classificationSchema,
    maxOutputTokens: 500,
    prompt,
  });
}
