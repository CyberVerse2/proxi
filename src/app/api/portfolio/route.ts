import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { proxyTokens, proxies } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getTokenPrice } from "@/lib/chain/token";
import { baseClient } from "@/lib/chain/config";
import { parseAbi } from "viem";

const ERC20_ABI = parseAbi([
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
]);

/**
 * GET /api/portfolio?wallet=0x...
 * Returns the user's proxy token holdings with current prices.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get("wallet");
  if (!wallet) return NextResponse.json({ error: "Missing wallet" }, { status: 400 });

  try {
    // Get all deployed proxy tokens
    const tokens = await db
      .select({ token: proxyTokens, proxy: proxies })
      .from(proxyTokens)
      .innerJoin(proxies, eq(proxyTokens.proxyId, proxies.id));

    const holdings = [];

    for (const { token, proxy } of tokens) {
      try {
        // Read on-chain balance
        const balance = await baseClient.readContract({
          address: token.tokenAddress as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "balanceOf",
          args: [wallet as `0x${string}`],
        });

        if (balance === BigInt(0)) continue;

        // Get decimals
        let decimals = 18;
        try {
          decimals = await baseClient.readContract({
            address: token.tokenAddress as `0x${string}`,
            abi: ERC20_ABI,
            functionName: "decimals",
          });
        } catch { /* default to 18 */ }

        const amount = Number(balance) / 10 ** decimals;
        const price = await getTokenPrice(token.tokenAddress);
        const value = amount * price;

        holdings.push({
          id: proxy.id,
          name: proxy.displayName ?? proxy.xHandle,
          handle: proxy.xHandle,
          avatar: proxy.avatarUrl ?? "/mock-avatar.jpg",
          amount: Math.round(amount),
          value: Math.round(value * 100) / 100,
          change24h: proxy.priceChange24h ?? 0,
          price,
          tokenAddress: token.tokenAddress,
        });
      } catch {
        // Skip tokens that fail to read (bad address, etc.)
        continue;
      }
    }

    return NextResponse.json(holdings);
  } catch (error) {
    console.error("[portfolio] Failed to fetch holdings:", error);
    return NextResponse.json([], { status: 200 });
  }
}
