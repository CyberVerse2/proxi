/**
 * Thread reconstruction.
 *
 * Tweets that share the same `conversation_id` and are authored by the same
 * user (self-replies forming a thread) are stitched into a single long-form
 * content chunk. This produces much richer content for analysis, embeds as
 * coherent thoughts instead of fragments, and scores higher naturally.
 */

import type { XTweet } from "./client";

export interface StitchedThread {
  /** The conversation_id all tweets share */
  conversationId: string;
  text: string;
  /** All original tweets in order */
  tweets: XTweet[];
  /** Aggregated metrics across all tweets in the thread */
  aggregatedMetrics: {
    like_count: number;
    retweet_count: number;
    reply_count: number;
    quote_count: number;
    impression_count: number;
  };
  /** Timestamp of the first tweet in the thread */
  created_at: string;
}

/**
 * Groups tweets by conversation_id, stitches multi-tweet threads into single
 * chunks, and returns both standalone tweets (unchanged) and stitched threads
 * (as synthetic XTweet objects for downstream compatibility).
 *
 * A "thread" requires at least 2 tweets with the same conversation_id authored
 * by the same user. Single tweets are returned as-is.
 */
export function reconstructThreads(
  tweets: XTweet[],
  authorUserId?: string,
): { standalones: XTweet[]; threads: StitchedThread[] } {
  // Group by conversation_id
  const groups = new Map<string, XTweet[]>();

  for (const tweet of tweets) {
    const convId = tweet.conversation_id ?? tweet.id;
    if (!groups.has(convId)) groups.set(convId, []);
    groups.get(convId)!.push(tweet);
  }

  const standalones: XTweet[] = [];
  const threads: StitchedThread[] = [];

  for (const [convId, group] of groups) {
    if (group.length < 2) {
      // Single tweet — not a thread
      standalones.push(group[0]);
      continue;
    }

    // Sort chronologically
    group.sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );

    // If we have an author ID, only stitch tweets by that author
    const authorTweets = authorUserId
      ? group.filter(
          (t) => !t.in_reply_to_user_id || t.in_reply_to_user_id === authorUserId,
        )
      : group;

    if (authorTweets.length < 2) {
      // After filtering, not enough for a thread
      for (const t of group) standalones.push(t);
      continue;
    }

    // Aggregate metrics
    const aggregatedMetrics = {
      like_count: 0,
      retweet_count: 0,
      reply_count: 0,
      quote_count: 0,
      impression_count: 0,
    };

    for (const t of authorTweets) {
      if (t.public_metrics) {
        aggregatedMetrics.like_count += t.public_metrics.like_count;
        aggregatedMetrics.retweet_count += t.public_metrics.retweet_count;
        aggregatedMetrics.reply_count += t.public_metrics.reply_count;
        aggregatedMetrics.quote_count += t.public_metrics.quote_count;
        aggregatedMetrics.impression_count += t.public_metrics.impression_count;
      }
    }

    // Stitch text — number each tweet in the thread for readability
    const stitchedText = authorTweets.map((t) => t.text).join("\n\n");

    threads.push({
      conversationId: convId,
      text: stitchedText,
      tweets: authorTweets,
      aggregatedMetrics,
      created_at: authorTweets[0].created_at,
    });
  }

  return { standalones, threads };
}

/**
 * Convert stitched threads back into synthetic XTweet objects so they can
 * flow through the existing scorer/filter/embeddings pipeline unchanged.
 */
export function threadsToSyntheticTweets(threads: StitchedThread[]): XTweet[] {
  return threads.map((thread) => ({
    id: `thread_${thread.conversationId}`,
    text: thread.text,
    created_at: thread.created_at,
    public_metrics: thread.aggregatedMetrics,
    conversation_id: thread.conversationId,
    // Mark as thread for content type detection
    referenced_tweets: [{ type: "replied_to", id: thread.conversationId }],
  }));
}
