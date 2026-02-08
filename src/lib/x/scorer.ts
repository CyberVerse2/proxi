import type { XTweet } from "./client";

export interface ScoredTweet {
  tweet: XTweet;
  score: number;
  contentType: "tweet" | "reply" | "thread";
  topic: string;
}

/* ------------------------------------------------------------------ */
/*  Topic detection (lightweight keyword / regex approach)             */
/* ------------------------------------------------------------------ */

const TOPIC_PATTERNS: [string, RegExp][] = [
  ["AI & Technology", /\b(ai|artificial intelligence|machine learning|ml|gpt|llm|neural|model|openai|anthropic|deep\s*learning|transformer)\b/i],
  ["Crypto & Web3", /\b(crypto|bitcoin|btc|eth|ethereum|web3|defi|nft|blockchain|token|solana|sol)\b/i],
  ["Business & Startups", /\b(startup|founder|vc|venture|revenue|growth|market|product|company|ceo|saas|funding|investor)\b/i],
  ["Programming", /\b(code|coding|developer|devs|typescript|javascript|python|rust|react|api|github|bug|deploy|backend|frontend)\b/i],
  ["Finance & Markets", /\b(stock|market|trading|invest|portfolio|bull|bear|s&p|nasdaq|earnings|dividend)\b/i],
  ["Personal & Life", /\b(life|family|health|workout|gym|morning|sleep|mental|gratitude|grateful|happy|sad)\b/i],
  ["Culture & Media", /\b(movie|film|music|book|art|culture|show|series|game|gaming|anime)\b/i],
  ["Politics & Society", /\b(politic|government|policy|election|democrat|republican|law|regulation|society|freedom)\b/i],
];

function detectTopic(text: string): string {
  let bestMatch = "General";
  let bestCount = 0;

  for (const [topic, pattern] of TOPIC_PATTERNS) {
    const matches = text.match(new RegExp(pattern, "gi"));
    if (matches && matches.length > bestCount) {
      bestCount = matches.length;
      bestMatch = topic;
    }
  }

  return bestMatch;
}

/* ------------------------------------------------------------------ */
/*  Scoring                                                            */
/* ------------------------------------------------------------------ */

/**
 * Quality scoring heuristic:
 * - Length bonus (more thoughtful content)
 * - Content type bonus (original > reply > thread)
 * - Engagement bonus (likes, retweets, quotes)
 * - Recency bonus (newer tweets get slight boost)
 * - Penalty for repetitive / generic content
 */
export function scoreTweet(tweet: XTweet): ScoredTweet {
  let score = 0;
  const text = tweet.text;
  const words = text.split(/\s+/).length;
  const metrics = tweet.public_metrics;

  // Determine content type
  const isReply = !!tweet.in_reply_to_user_id;
  const isThread = tweet.id.startsWith("thread_") ||
    (tweet.referenced_tweets?.some((r) => r.type === "replied_to") && !isReply);
  const contentType: "tweet" | "reply" | "thread" = isThread ? "thread" : isReply ? "reply" : "tweet";

  // Length score (0-25 pts)
  score += Math.min(words / 4, 25);

  // Content type bonus — threads get the biggest bonus since they're richest
  if (contentType === "tweet") score += 10;
  else if (contentType === "thread") score += 20;
  else score += 5;

  // Engagement score (0-30 pts)
  if (metrics) {
    const engagement = metrics.like_count * 1 + metrics.retweet_count * 2 + metrics.quote_count * 3 + metrics.reply_count * 0.5;
    score += Math.min(Math.log10(engagement + 1) * 10, 30);
  }

  // Recency bonus (0-10 pts, decay over 90 days)
  const daysSince = (Date.now() - new Date(tweet.created_at).getTime()) / (1000 * 60 * 60 * 24);
  score += Math.max(0, 10 - (daysSince / 9));

  // Topic diversity signal: tweets with questions, opinions, analysis tend to be more valuable
  if (/\?/.test(text)) score += 3;
  if (/I think|I believe|IMO|my take|hot take/i.test(text)) score += 5;
  if (/\b(because|therefore|however|nevertheless)\b/i.test(text)) score += 3;

  // Detect topic
  const topic = detectTopic(text);

  return { tweet, score, contentType, topic };
}

/* ------------------------------------------------------------------ */
/*  Topic-diverse selection                                            */
/* ------------------------------------------------------------------ */

/**
 * Select top posts with topic diversity.
 *
 * Instead of just sort+slice (which would over-represent the dominant topic),
 * we ensure no single topic exceeds `maxTopicShare` of the final selection.
 * Posts are selected proportionally from each topic, ordered by score.
 */
export function selectTopPosts(
  tweets: XTweet[],
  limit = 1000,
  maxTopicShare = 0.3,
): ScoredTweet[] {
  const scored = tweets.map(scoreTweet);
  scored.sort((a, b) => b.score - a.score);

  // Group by topic
  const byTopic = new Map<string, ScoredTweet[]>();
  for (const s of scored) {
    if (!byTopic.has(s.topic)) byTopic.set(s.topic, []);
    byTopic.get(s.topic)!.push(s);
  }

  const maxPerTopic = Math.ceil(limit * maxTopicShare);
  const selected: ScoredTweet[] = [];
  const topicCounts = new Map<string, number>();

  // First pass: fill up to maxPerTopic per topic, in global score order
  for (const s of scored) {
    if (selected.length >= limit) break;
    const count = topicCounts.get(s.topic) ?? 0;
    if (count < maxPerTopic) {
      selected.push(s);
      topicCounts.set(s.topic, count + 1);
    }
  }

  // Second pass: if we haven't hit the limit, fill remaining with any leftover
  if (selected.length < limit) {
    const selectedIds = new Set(selected.map((s) => s.tweet.id));
    for (const s of scored) {
      if (selected.length >= limit) break;
      if (!selectedIds.has(s.tweet.id)) {
        selected.push(s);
      }
    }
  }

  return selected;
}
