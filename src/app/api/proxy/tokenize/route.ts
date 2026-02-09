import { NextResponse } from "next/server";
import { getUserByPrivyId, getProxyByCreatorId } from "@/lib/db/queries";
import { deployProxyToken } from "@/lib/chain/token";

/**
 * POST /api/proxy/tokenize
 * Deploy a token for the user's proxy via Clanker SDK.
 * The deployer wallet signs the tx; the user's wallet is set as reward recipient.
 */
export async function POST(request: Request) {
  const { privyId, walletAddress } = await request.json();
  if (!privyId || !walletAddress) {
    return NextResponse.json(
      { error: "Missing privyId or walletAddress" },
      { status: 400 }
    );
  }

  const user = await getUserByPrivyId(privyId);
  if (!user)
    return NextResponse.json({ error: "User not found" }, { status: 404 });

  const proxy = await getProxyByCreatorId(user.id);
  if (!proxy)
    return NextResponse.json({ error: "No proxy found" }, { status: 404 });

  if (proxy.tokenAddress) {
    return NextResponse.json(
      { error: "Token already deployed", tokenAddress: proxy.tokenAddress },
      { status: 409 }
    );
  }

  try {
    const result = await deployProxyToken({
      name: proxy.displayName ?? proxy.xHandle,
      symbol: proxy.ticker ?? proxy.xHandle.toUpperCase().slice(0, 5),
      proxyId: proxy.id,
      creatorAddress: walletAddress,
      imageUrl: proxy.avatarUrl ?? undefined,
      description: proxy.bio ?? undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[tokenize] Deployment failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Token deployment failed",
      },
      { status: 500 }
    );
  }
}
