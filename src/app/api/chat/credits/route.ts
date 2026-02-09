import { NextRequest, NextResponse } from "next/server";
import {
  getProxyByHandle,
  getUserByPrivyId,
  getUserProxyMessageCount,
} from "@/lib/db/queries";
import { getOnChainTokenBalance } from "@/lib/chain/token";

const FREE_MESSAGES_PER_PROXY = 5;

/**
 * GET /api/chat/credits?proxyHandle=X&privyId=Y
 *
 * Returns the user's remaining free messages for a proxy and
 * whether they hold tokens to continue beyond the free limit.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const proxyHandle = searchParams.get("proxyHandle");
  const privyId = searchParams.get("privyId");

  if (!proxyHandle) {
    return NextResponse.json(
      { error: "Missing proxyHandle" },
      { status: 400 },
    );
  }

  const proxy = await getProxyByHandle(proxyHandle);
  if (!proxy) {
    return NextResponse.json({ error: "Proxy not found" }, { status: 404 });
  }

  // If no token on this proxy, chat is unlimited
  if (!proxy.tokenAddress) {
    return NextResponse.json({
      freeRemaining: FREE_MESSAGES_PER_PROXY,
      freeLimit: FREE_MESSAGES_PER_PROXY,
      freeUsed: 0,
      hasTokens: true,
      unlimited: true,
    });
  }

  // If user isn't authenticated, return full free allowance
  if (!privyId) {
    return NextResponse.json({
      freeRemaining: FREE_MESSAGES_PER_PROXY,
      freeLimit: FREE_MESSAGES_PER_PROXY,
      freeUsed: 0,
      hasTokens: false,
      unlimited: false,
    });
  }

  const user = await getUserByPrivyId(privyId);
  if (!user) {
    return NextResponse.json({
      freeRemaining: FREE_MESSAGES_PER_PROXY,
      freeLimit: FREE_MESSAGES_PER_PROXY,
      freeUsed: 0,
      hasTokens: false,
      unlimited: false,
    });
  }

  const msgCount = await getUserProxyMessageCount(user.id, proxy.id);
  const freeRemaining = Math.max(0, FREE_MESSAGES_PER_PROXY - msgCount);

  // Check token balance if they have a wallet
  let hasTokens = false;
  if (user.walletAddress) {
    try {
      const balance = await getOnChainTokenBalance(
        proxy.tokenAddress as `0x${string}`,
        user.walletAddress as `0x${string}`,
      );
      hasTokens = balance > 0n;
    } catch {
      // If balance check fails, assume no tokens
    }
  }

  return NextResponse.json({
    freeRemaining,
    freeLimit: FREE_MESSAGES_PER_PROXY,
    freeUsed: msgCount,
    hasTokens,
    unlimited: false,
  });
}
