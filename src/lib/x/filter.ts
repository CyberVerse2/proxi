import type { XTweet } from "./client";

/**
 * Trash filter: removes low-quality tweets that would pollute the AI brain.
 */
export function filterTrash(tweets: XTweet[]): XTweet[] {
  return tweets.filter((tweet) => {
    const text = tweet.text.trim();

    // Skip retweets (shouldn't be here but double-check)
    if (text.startsWith("RT @")) return false;

    // Skip very short tweets (under 10 words)
    if (text.split(/\s+/).length < 10) return false;

    // Skip "gm/gn" tweets
    if (/^(gm|gn|good\s*(morning|night))\s*[!.🌅🌙]*$/i.test(text)) return false;

    // Skip link-only tweets (just a URL, no substance)
    const withoutUrls = text.replace(/https?:\/\/\S+/g, "").trim();
    if (withoutUrls.length < 15) return false;

    // Skip emoji-only tweets
    const withoutEmoji = text.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, "").trim();
    if (withoutEmoji.length < 10) return false;

    // Skip pure hashtag spam (more than 5 hashtags relative to word count)
    const hashtags = (text.match(/#\w+/g) || []).length;
    const words = text.split(/\s+/).length;
    if (hashtags > 5 && hashtags / words > 0.5) return false;

    return true;
  });
}
