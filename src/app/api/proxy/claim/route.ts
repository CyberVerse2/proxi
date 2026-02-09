import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/privy";
import { privyServer } from "@/lib/auth/privy";
import {
  getProxyByHandle,
  getUserByPrivyId,
  upsertUser,
  updateProxy,
} from "@/lib/db/queries";

/**
 * POST /api/proxy/claim
 *
 * Claim an unclaimed proxy by verifying the authenticated user's
 * X (Twitter) handle matches the proxy's xHandle.
 *
 * Headers: Authorization: Bearer <privy-access-token>
 * Body:    { handle: string }
 */
export async function POST(request: Request) {
  try {
    // 1. Authenticate the user
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    const authUser = await getAuthUser(token);

    if (!authUser) {
      return NextResponse.json(
        { error: "Unauthorized — please log in" },
        { status: 401 },
      );
    }

    // 2. Parse body
    const body = await request.json();
    const { handle } = body;

    if (!handle || typeof handle !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid handle" },
        { status: 400 },
      );
    }

    // 3. Look up the proxy
    const proxy = await getProxyByHandle(handle);
    if (!proxy) {
      return NextResponse.json({ error: "Proxy not found" }, { status: 404 });
    }

    if (proxy.creatorId) {
      return NextResponse.json(
        { error: "This proxy has already been claimed" },
        { status: 409 },
      );
    }

    // 4. Get the user's Privy profile to verify their X handle
    const privyUser = await privyServer.getUser(authUser.userId);
    const twitterAccount = privyUser.linkedAccounts.find(
      (a) => a.type === "twitter_oauth",
    );

    if (!twitterAccount || !("username" in twitterAccount)) {
      return NextResponse.json(
        {
          error:
            "No X (Twitter) account linked. Please log in with your X account to claim this proxy.",
        },
        { status: 403 },
      );
    }

    const userXHandle = (twitterAccount as { username: string }).username;

    // 5. Verify the X handle matches (case-insensitive)
    if (userXHandle.toLowerCase() !== proxy.xHandle.toLowerCase()) {
      return NextResponse.json(
        {
          error: `Your X account @${userXHandle} doesn't match this proxy's handle @${proxy.xHandle}. You can only claim your own proxy.`,
        },
        { status: 403 },
      );
    }

    // 6. Upsert the user in our database
    const walletAccount = privyUser.linkedAccounts.find(
      (a) => a.type === "wallet" && "chainType" in a && a.chainType === "ethereum",
    );
    const walletAddress = walletAccount && "address" in walletAccount
      ? (walletAccount as { address: string }).address
      : undefined;

    const twitterName = "name" in twitterAccount
      ? (twitterAccount as { name: string }).name
      : undefined;
    const twitterPfp = "profilePictureUrl" in twitterAccount
      ? (twitterAccount as { profilePictureUrl: string }).profilePictureUrl
      : undefined;

    const user = await upsertUser({
      privyId: authUser.userId,
      xHandle: userXHandle,
      displayName: twitterName ?? userXHandle,
      xProfileImageUrl: twitterPfp,
      walletAddress: walletAddress ?? undefined,
    });

    // 7. Link the proxy to this user
    await updateProxy(proxy.id, { creatorId: user.id });

    return NextResponse.json({
      success: true,
      message: `Successfully claimed @${proxy.xHandle}! You'll now earn fee royalties.`,
      userId: user.id,
    });
  } catch (err) {
    console.error("Claim proxy error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to claim proxy",
      },
      { status: 500 },
    );
  }
}
