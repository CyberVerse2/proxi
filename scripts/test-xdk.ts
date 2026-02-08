/**
 * Quick smoke test for the XDK client.
 * Run: npx tsx scripts/test-xdk.ts
 */

import { Client } from "@xdevplatform/xdk";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  const client = new Client({ bearerToken: process.env.X_BEARER_TOKEN! });

  // Test 1: Fetch a user profile
  console.log("--- Test 1: getUserByUsername ---");
  const userRes = await client.users.getByUsername("elonmusk", {
    userFields: ["profile_image_url", "description", "public_metrics"],
  });

  if (userRes.data) {
    console.log("Name:", userRes.data.name);
    console.log("Username:", userRes.data.username);
    console.log("ID:", userRes.data.id);
    console.log("Description:", userRes.data.description?.slice(0, 80) + "...");
    console.log("Public Metrics:", JSON.stringify(userRes.data.publicMetrics));
    console.log("Profile Image:", userRes.data.profileImageUrl);
  } else {
    console.log("ERROR: No data returned", userRes);
    return;
  }

  // Test 2: Fetch a page of tweets
  console.log("\n--- Test 2: getUserPosts (5 tweets) ---");
  const tweetsRes = await client.users.getPosts(String(userRes.data.id), {
    maxResults: 5,
    tweetFields: [
      "created_at",
      "public_metrics",
      "referenced_tweets",
      "in_reply_to_user_id",
      "conversation_id",
    ],
    exclude: ["retweets"],
  });

  if (tweetsRes.data?.length) {
    for (const t of tweetsRes.data) {
      console.log(`[${t.id}] ${String(t.text).slice(0, 80)}...`);
      console.log(
        `  created: ${t.createdAt}, metrics: ${JSON.stringify(t.publicMetrics)}`,
      );
    }
    console.log("Meta:", JSON.stringify(tweetsRes.meta));
  } else {
    console.log("ERROR: No tweets returned", tweetsRes);
    return;
  }

  console.log("\n✅ XDK client is working!");
}

main().catch(console.error);
