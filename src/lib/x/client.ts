/**
 * X API client using the official TypeScript XDK.
 *
 * - Read client (Bearer token): user lookups, tweet fetching
 * - Write client (OAuth 1.0a): posting tweets, replies
 */

import {
  Client,
  OAuth1,
  type ClientConfig,
  type OAuth1Config,
} from "@xdevplatform/xdk";

// ---------------------------------------------------------------------------
// Backward-compatible types used by the rest of the codebase
// (filter.ts, scorer.ts, ingest.ts, bot.ts)
// ---------------------------------------------------------------------------

export interface XUser {
  id: string;
  name: string;
  username: string;
  profile_image_url?: string;
  description?: string;
  public_metrics?: {
    followers_count: number;
    following_count: number;
    tweet_count: number;
  };
}

export interface XTweet {
  id: string;
  text: string;
  created_at: string;
  public_metrics?: {
    like_count: number;
    retweet_count: number;
    reply_count: number;
    quote_count: number;
    impression_count: number;
  };
  referenced_tweets?: { type: string; id: string }[];
  in_reply_to_user_id?: string;
  conversation_id?: string;
}

// ---------------------------------------------------------------------------
// XDK clients (lazily created, cached per process)
// ---------------------------------------------------------------------------

let _readClient: Client | null = null;
let _writeClient: Client | null = null;

/** Read-only client — uses Bearer token for public data access. */
function getReadClient(): Client {
  if (_readClient) return _readClient;

  const bearerToken = process.env.X_BEARER_TOKEN;
  if (!bearerToken) throw new Error("Missing X_BEARER_TOKEN env var");

  _readClient = new Client({ bearerToken } satisfies ClientConfig);
  return _readClient;
}

/** Write client — uses OAuth 1.0a for posting tweets on behalf of the bot. */
function getWriteClient(): Client {
  if (_writeClient) return _writeClient;

  const apiKey = process.env.X_API_KEY;
  const apiSecret = process.env.X_API_SECRET;
  const accessToken = process.env.X_ACCESS_TOKEN;
  const accessTokenSecret = process.env.X_ACCESS_SECRET;

  if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) {
    throw new Error(
      "Missing X OAuth 1.0a credentials (X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET)",
    );
  }

  const oauth1 = new OAuth1({
    apiKey,
    apiSecret,
    accessToken,
    accessTokenSecret,
    callback: process.env.NEXT_PUBLIC_APP_URL || "https://proxi.fun",
  } satisfies OAuth1Config);

  _writeClient = new Client({ oauth1 } satisfies ClientConfig);
  return _writeClient;
}

// ---------------------------------------------------------------------------
// Public API — drop-in replacements for the previous raw-fetch functions
// ---------------------------------------------------------------------------

/**
 * Look up an X user by their handle.
 * Returns our XUser type or null if not found.
 */
export async function getUserByUsername(
  username: string,
): Promise<XUser | null> {
  try {
    const client = getReadClient();
    const response = await client.users.getByUsername(username, {
      userFields: ["profile_image_url", "description", "public_metrics"],
    });

    const data = response.data;
    if (!data) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pm = data.publicMetrics as Record<string, any> | undefined;

    return {
      id: String(data.id),
      name: data.name,
      username: String(data.username),
      profile_image_url: data.profileImageUrl,
      description: data.description,
      public_metrics: pm
        ? {
            followers_count: pm.followers_count ?? pm.followersCount ?? 0,
            following_count: pm.following_count ?? pm.followingCount ?? 0,
            tweet_count: pm.tweet_count ?? pm.tweetCount ?? 0,
          }
        : undefined,
    };
  } catch (error) {
    console.error(
      `[x/client] getUserByUsername("${username}") failed:`,
      error,
    );
    return null;
  }
}

/**
 * Pull up to `maxResults` tweets for a given user ID.
 * Handles pagination automatically.
 */
export async function getAllUserTweets(
  userId: string,
  maxResults = 3200,
): Promise<XTweet[]> {
  const client = getReadClient();
  const all: XTweet[] = [];
  let paginationToken: string | undefined;

  try {
    while (all.length < maxResults) {
      const perPage = Math.min(maxResults - all.length, 100);

      const response = await client.users.getPosts(userId, {
        maxResults: perPage,
        tweetFields: [
          "created_at",
          "public_metrics",
          "referenced_tweets",
          "in_reply_to_user_id",
          "conversation_id",
        ],
        exclude: ["retweets", "replies"],
        ...(paginationToken ? { paginationToken } : {}),
      });

      const tweets = response.data;
      if (!tweets?.length) break;

      for (const t of tweets) {
        all.push(mapTweet(t));
      }

      // The SDK meta may use camelCase or snake_case depending on version
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const meta = response.meta as Record<string, any> | undefined;
      paginationToken = meta?.next_token ?? meta?.nextToken;
      if (!paginationToken) break;
    }
  } catch (error) {
    console.error(
      `[x/client] getAllUserTweets("${userId}") failed after ${all.length} tweets:`,
      error,
    );
  }

  return all;
}

/**
 * Mention tweet with author info attached (for poll-mentions task).
 */
export interface XMention extends XTweet {
  author_username?: string;
  author_id?: string;
}

/**
 * Fetch recent mentions of a user (the bot) since a given tweet ID.
 * Returns the mentions plus the newest tweet ID for cursor tracking.
 */
export async function getBotMentions(
  userId: string,
  sinceId?: string,
  maxResults = 100,
): Promise<{ mentions: XMention[]; newestId: string | null }> {
  try {
    const client = getReadClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const params: Record<string, any> = {
      maxResults: Math.min(maxResults, 100),
      tweetFields: [
        "created_at",
        "public_metrics",
        "author_id",
        "in_reply_to_user_id",
        "conversation_id",
      ],
      expansions: ["author_id"],
      userFields: ["username"],
    };

    if (sinceId) {
      params.sinceId = sinceId;
    }

    const response = await client.users.getMentions(userId, params);

    const tweets = response.data;
    if (!tweets?.length) {
      return { mentions: [], newestId: null };
    }

    // Build author lookup from includes.users
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const includes = (response as any).includes as Record<string, any> | undefined;
    const usersMap = new Map<string, string>();
    if (includes?.users) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const u of includes.users as any[]) {
        const uid = String(u.id);
        const uname = String(u.username ?? u.userName ?? "");
        if (uid && uname) usersMap.set(uid, uname);
      }
    }

    const mentions: XMention[] = tweets.map((t) => {
      const base = mapTweet(t);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const authorId = String((t as any).authorId ?? (t as any).author_id ?? "");
      return {
        ...base,
        author_id: authorId || undefined,
        author_username: usersMap.get(authorId) || undefined,
      };
    });

    // Newest ID is the first item (most recent)
    const newestId = mentions[0]?.id ?? null;

    return { mentions, newestId };
  } catch (error) {
    console.error(
      `[x/client] getBotMentions("${userId}") failed:`,
      error,
    );
    return { mentions: [], newestId: null };
  }
}

/**
 * Post a tweet (optionally as a reply). Uses OAuth 1.0a.
 * Returns the new tweet ID, or null on failure.
 */
export async function sendTweet(
  text: string,
  replyToId?: string,
): Promise<string | null> {
  try {
    const client = getWriteClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body: Record<string, any> = { text };
    if (replyToId) {
      body.reply = { in_reply_to_tweet_id: replyToId };
    }

    const response = await client.posts.create(body);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = response.data as Record<string, any> | undefined;
    return data?.id ? String(data.id) : null;
  } catch (error) {
    console.error("[x/client] sendTweet failed:", error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Internal: map XDK response objects → our backward-compatible types
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapTweet(t: Record<string, any>): XTweet {
  const pm = t.publicMetrics ?? t.public_metrics;

  return {
    id: String(t.id),
    text: String(t.text ?? ""),
    created_at: String(t.createdAt ?? t.created_at ?? ""),
    public_metrics: pm
      ? {
          like_count: pm.like_count ?? pm.likeCount ?? 0,
          retweet_count: pm.retweet_count ?? pm.retweetCount ?? 0,
          reply_count: pm.reply_count ?? pm.replyCount ?? 0,
          quote_count: pm.quote_count ?? pm.quoteCount ?? 0,
          impression_count: pm.impression_count ?? pm.impressionCount ?? 0,
        }
      : undefined,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    referenced_tweets: (t.referencedTweets ?? t.referenced_tweets)?.map(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (r: Record<string, any>) => ({    

        type: String(r.type),
        id: String(r.id),
      }),
    ),
    in_reply_to_user_id:
      t.inReplyToUserId ?? t.in_reply_to_user_id
        ? String(t.inReplyToUserId ?? t.in_reply_to_user_id)
        : undefined,
    conversation_id:
      t.conversationId ?? t.conversation_id
        ? String(t.conversationId ?? t.conversation_id)
        : undefined,
  };
}
