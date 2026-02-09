import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { proxies } from "@/lib/db/schema";
import { isNotNull } from "drizzle-orm";
import { getTokenPrice } from "@/lib/chain/token";
import { baseClient } from "@/lib/chain/config";
import { parseAbi, formatUnits } from "viem";
import {
  DEFAULT_AVATAR,
  USDC_ADDRESS,
  USDC_DECIMALS,
  MESSAGE_PRICE_USD,
} from "@/lib/config/constants";

const ERC20_ABI = parseAbi([
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
]);

/**
 * GET /api/portfolio?wallet=0x...
 * Returns the user's proxy token holdings + USDC balance.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get("wallet");
  if (!wallet)
    return NextResponse.json({ error: "Missing wallet" }, { status: 400 });

  try {
    // Get all proxies that have a deployed token
    const allProxies = await db
      .select()
      .from(proxies)
      .where(isNotNull(proxies.tokenAddress));

    const holdings = [];

    for (const proxy of allProxies) {
      if (!proxy.tokenAddress) continue;
      try {
        const balance = await baseClient.readContract({
          address: proxy.tokenAddress as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "balanceOf",
          args: [wallet as `0x${string}`],
        });

        if (balance === 0n) continue;

        const amount = Number(balance) / 1e18;

        // Try market price first, fall back to chat-price-based valuation
        let price = 0;
        let value = 0;
        try {
          price = await getTokenPrice(proxy.tokenAddress);
          value = amount * price;
        } catch {
          /* no market price */
        }

        // If market price is 0, estimate value from chat price
        if (value === 0) {
          const chatPrice = proxy.chatPrice ?? MESSAGE_PRICE_USD;
          // Rough estimate: token value = chatPrice (each token ≈ fraction of a message)
          value = amount * chatPrice * 0.01; // conservative estimate
        }

        holdings.push({
          id: proxy.id,
          name: proxy.displayName ?? proxy.xHandle,
          handle: proxy.xHandle,
          avatar: proxy.avatarUrl ?? DEFAULT_AVATAR,
          amount: Math.round(amount),
          value: Math.round(value * 100) / 100,
          change24h: proxy.priceChange24h ?? 0,
          price,
          tokenAddress: proxy.tokenAddress,
        });
      } catch {
        continue;
      }
    }

    // Fetch USDC balance
    let usdcBalance = 0;
    try {
      const rawBalance = await baseClient.readContract({
        address: USDC_ADDRESS as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [wallet as `0x${string}`],
      });
      usdcBalance =
        Math.round(
          parseFloat(formatUnits(rawBalance, USDC_DECIMALS)) * 100,
        ) / 100;
    } catch {
      /* no USDC */
    }

    return NextResponse.json({ holdings, usdcBalance });
  } catch (error) {
    console.error("[portfolio] Failed to fetch holdings:", error);
    return NextResponse.json({ holdings: [], usdcBalance: 0 }, { status: 200 });
  }
}
