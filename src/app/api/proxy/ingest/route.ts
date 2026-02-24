import { NextResponse } from "next/server";
import { inngest } from "@/inngest/client";
import {
  getUserByPrivyId,
  getProxyByCreatorId,
  getProxyByHandle,
  createProxy,
  updateProxy,
} from "@/lib/db/queries";
import { getUserByUsername } from "@/lib/x/client";

/**
 * POST /api/proxy/ingest
 * Triggers the ingest-proxy Trigger.dev task from the setup wizard.
 * Creates the proxy record if needed.
 */
export async function POST(request: Request) {
  const { privyId, xHandle } = await request.json();
  if (!privyId || !xHandle) {
    return NextResponse.json({ error: "Missing privyId or xHandle" }, { status: 400 });
  }

  const user = await getUserByPrivyId(privyId);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Check for existing proxy
  let proxy = await getProxyByCreatorId(user.id);
  if (!proxy) {
    proxy = await getProxyByHandle(xHandle);
  }

  // Create new proxy if needed
  if (!proxy) {
    // Fetch X profile for display name and avatar
    let displayName = xHandle;
    let avatarUrl: string | undefined;
    let bio: string | undefined;
    try {
      const xUser = await getUserByUsername(xHandle);
      if (xUser) {
        displayName = xUser.name ?? xHandle;
        avatarUrl = xUser.profile_image_url?.replace("_normal", "_400x400");
        bio = xUser.description;
      }
    } catch { /* fall back to handle */ }

    proxy = await createProxy({
      xHandle,
      displayName,
      avatarUrl,
      bio,
      status: "building",
    });
  }

  // Wallet is required for token deployment
  if (!user.walletAddress) {
    return NextResponse.json(
      { error: "No wallet address found. Please reconnect your account." },
      { status: 400 }
    );
  }

  // Trigger the ingestion via Inngest
  try {
    await inngest.send({
      name: "proxy/ingest.requested",
      data: {
        proxyId: proxy.id,
        xHandle,
        maxTweets: 500,
        walletAddress: user.walletAddress,
      },
    });

    return NextResponse.json({ proxyId: proxy.id });
  } catch (error) {
    console.error("[setup] Failed to trigger ingestion:", error);
    await updateProxy(proxy.id, { status: "failed" }).catch(() => {});
    return NextResponse.json(
      { error: "Failed to start ingestion." },
      { status: 500 }
    );
  }
}
