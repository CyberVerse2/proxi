import { NextResponse } from "next/server";
import { getAuthUser, privyServer } from "@/lib/auth/privy";
import { getProxyByHandle, updateProxy, upsertUser } from "@/lib/db/queries";

export async function POST(request: Request) {
  // 1. Verify auth token
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  const authUser = await getAuthUser(token);

  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Get full Privy user to extract Twitter info + wallet
  const privyUser = await privyServer.getUser(authUser.userId);
  const twitterAccount = privyUser.linkedAccounts.find(
    (a) => a.type === "twitter_oauth"
  );

  if (!twitterAccount || !("username" in twitterAccount)) {
    return NextResponse.json(
      { error: "No Twitter account linked to your Privy account" },
      { status: 400 }
    );
  }

  const xHandle = twitterAccount.username as string;

  // 3. Read handle from body
  const { handle } = await request.json();
  if (!handle) {
    return NextResponse.json({ error: "Missing handle" }, { status: 400 });
  }

  // 4. Fetch proxy
  const proxy = await getProxyByHandle(handle);
  if (!proxy) {
    return NextResponse.json({ error: "Proxy not found" }, { status: 404 });
  }

  // 5. Validate proxy not already claimed
  if (proxy.creatorId) {
    return NextResponse.json(
      { error: "Proxy already claimed" },
      { status: 409 }
    );
  }

  // 6. Validate X handle matches
  if (xHandle.toLowerCase() !== proxy.xHandle.toLowerCase()) {
    return NextResponse.json(
      { error: "Your X account does not match this proxy" },
      { status: 403 }
    );
  }

  // 7. Get wallet address from Privy user
  const wallet = privyUser.linkedAccounts.find(
    (a) => a.type === "wallet" && a.chainType === "ethereum"
  );
  const walletAddress =
    wallet && "address" in wallet ? (wallet.address as string) : null;

  // 8. Upsert user
  const user = await upsertUser({
    privyId: authUser.userId,
    xHandle,
    walletAddress,
    xProfileImageUrl:
      "profilePictureUrl" in twitterAccount
        ? (twitterAccount.profilePictureUrl as string)
        : null,
    displayName:
      "name" in twitterAccount
        ? (twitterAccount.name as string)
        : xHandle,
  });

  // 9. Update proxy with creatorId
  await updateProxy(proxy.id, { creatorId: user.id });

  return NextResponse.json({ success: true, userId: user.id });
}
