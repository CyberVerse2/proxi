import { NextRequest, NextResponse } from "next/server";
import {
  getProxyByHandle,
  getUserByPrivyId,
  getUserProxyMessageCount,
} from "@/lib/db/queries";
import { getOnChainTokenBalance } from "@/lib/chain/token";
import { getPrivyWalletAddress } from "@/lib/auth/privy";
import { formatUnits } from "viem";

const FREE_MESSAGES_PER_PROXY = 5;
const MESSAGE_PRICE_USD = 0.1;
const USDC_DECIMALS = 6;
const ZX_API_KEY = process.env["0X_API_KEY"] ?? "";
const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

/**
 * Call 0x price API to find how many tokens $0.10 USDC buys (= 1 message).
 * Returns raw token amount (18 decimals) as a bigint-friendly number.
 */
async function getTokensPerMessage(
  tokenAddress: string,
): Promise<number> {
  if (!ZX_API_KEY) return 0;
  try {
    const sellAmount = BigInt(
      Math.round(MESSAGE_PRICE_USD * 10 ** USDC_DECIMALS),
    ).toString();
    const params = new URLSearchParams({
      chainId: "8453",
      sellToken: USDC,
      buyToken: tokenAddress,
      sellAmount,
      slippageBps: "100",
    });
    const url = `https://api.0x.org/swap/allowance-holder/price?${params}`;
    const res = await fetch(url, {
      headers: { "0x-api-key": ZX_API_KEY, "0x-version": "v2" },
      next: { revalidate: 60 },
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("[credits] 0x price API error:", res.status, errText);
      return 0;
    }
    const data = await res.json();
    console.log("[credits] tokensPerMessage raw buyAmount:", data.buyAmount);
    return Number(data.buyAmount) / 1e18;
  } catch {
    return 0;
  }
}

/**
 * GET /api/chat/credits?proxyHandle=X&privyId=Y
 *
 * Returns the user's remaining free messages for a proxy,
 * whether they hold tokens, and how many messages their tokens cover.
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
      messagesOwned: 0,
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
      messagesOwned: 0,
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
      messagesOwned: 0,
      unlimited: false,
    });
  }

  const msgCount = await getUserProxyMessageCount(user.id, proxy.id);
  const freeRemaining = Math.max(0, FREE_MESSAGES_PER_PROXY - msgCount);

  // Resolve wallet address from Privy (source of truth)
  const walletAddress = await getPrivyWalletAddress(privyId);

  // Check token balance and compute messages owned
  let hasTokens = false;
  let messagesOwned = 0;
  if (walletAddress) {
    try {
      const [balance, tokensPerMsg] = await Promise.all([
        getOnChainTokenBalance(
          proxy.tokenAddress as `0x${string}`,
          walletAddress as `0x${string}`,
        ),
        getTokensPerMessage(proxy.tokenAddress),
      ]);
      hasTokens = balance > 0n;
      if (tokensPerMsg > 0) {
        const tokenBalanceNum = parseFloat(formatUnits(balance, 18));
        messagesOwned = Math.floor(tokenBalanceNum / tokensPerMsg);
      }
    } catch {
      // If balance check fails, assume no tokens
    }
  }

  return NextResponse.json({
    freeRemaining,
    freeLimit: FREE_MESSAGES_PER_PROXY,
    freeUsed: msgCount,
    hasTokens,
    messagesOwned,
    unlimited: false,
  });
}
