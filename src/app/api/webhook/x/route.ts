import { NextResponse } from "next/server";
import { parseCreateIntent, handleCreateMention } from "@/lib/x/bot";
import type { XTweet } from "@/lib/x/client";

/**
 * X Webhook endpoint for Account Activity API.
 * Handles CRC verification and incoming mention events.
 */

// GET: CRC challenge verification
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const crcToken = searchParams.get("crc_token");

  if (!crcToken) {
    return NextResponse.json({ error: "Missing crc_token" }, { status: 400 });
  }

  // Create HMAC-SHA256 hash using the consumer secret
  const crypto = await import("crypto");
  const hmac = crypto.createHmac("sha256", process.env.X_API_SECRET!);
  hmac.update(crcToken);
  const responseToken = `sha256=${hmac.digest("base64")}`;

  return NextResponse.json({ response_token: responseToken });
}

// POST: Incoming webhook events
export async function POST(request: Request) {
  const body = await request.json();

  // Handle tweet_create_events (mentions)
  const tweets = body.tweet_create_events;
  if (!tweets?.length) {
    return NextResponse.json({ ok: true });
  }

  for (const rawTweet of tweets) {
    const tweet: XTweet = {
      id: rawTweet.id_str,
      text: rawTweet.text,
      created_at: rawTweet.created_at,
      public_metrics: {
        like_count: rawTweet.favorite_count ?? 0,
        retweet_count: rawTweet.retweet_count ?? 0,
        reply_count: 0,
        quote_count: rawTweet.quote_count ?? 0,
        impression_count: 0,
      },
    };

    const intent = parseCreateIntent(tweet);
    if (intent) {
      const authorHandle = rawTweet.user?.screen_name;
      if (authorHandle) {
        // Fire and forget - don't block the webhook response
        handleCreateMention(authorHandle, tweet.id).catch((err) => {
          console.error("Failed to handle create mention:", err);
        });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
