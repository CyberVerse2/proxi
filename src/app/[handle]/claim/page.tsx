import { notFound } from "next/navigation";
import { getProxyByHandle, getUserByXHandle } from "@/lib/db/queries";
import { ClaimClient } from "./claim-client";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  getTotalWethFees,
  getTokenMarketData,
  type TokenMarketData,
} from "@/lib/chain/token";
import { formatEther } from "viem";

interface ClaimPageProps {
  params: Promise<{ handle: string }>;
}

export interface ClaimFeeData {
  /** Total earnings denominated in USD */
  totalUsd: number;
}

export interface TokenHolder {
  address: string;
  percentage: number;
  amount: string;
  label?: string;
}

async function fetchEthPriceUsd(): Promise<number> {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
      { next: { revalidate: 300 } }
    );
    if (!res.ok) return 0;
    const data = await res.json();
    return data?.ethereum?.usd ?? 0;
  } catch {
    return 0;
  }
}

async function fetchTopHolders(
  tokenAddress: string,
): Promise<TokenHolder[]> {
  const moralisKey = process.env.MORALIS_API_KEY;
  if (!moralisKey) return [];

  try {
    const res = await fetch(
      `https://deep-index.moralis.io/api/v2.2/erc20/${tokenAddress}/owners?chain=base&order=DESC&limit=100`,
      {
        headers: {
          accept: "application/json",
          "X-API-Key": moralisKey,
        },
        next: { revalidate: 600 },
      }
    );

    if (!res.ok) return [];
    const data = await res.json();
    const holders: {
      owner_address: string;
      balance_formatted: string;
      percentage_relative_to_total_supply: number;
      owner_address_label?: string;
    }[] = data?.result ?? [];

    if (holders.length === 0) return [];

    const parsed: TokenHolder[] = [];
    for (const h of holders) {
      const rawAmount = parseFloat(h.balance_formatted);
      if (!rawAmount || rawAmount <= 0) continue;
      parsed.push({
        address: h.owner_address,
        percentage:
          Math.round(h.percentage_relative_to_total_supply * 100) / 100,
        amount: formatHolderAmount(rawAmount),
        ...(h.owner_address_label ? { label: h.owner_address_label } : {}),
      });
    }
    return parsed;
  } catch {
    return [];
  }
}

function formatHolderAmount(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
  return n.toFixed(2);
}

export default async function ClaimPage({ params }: ClaimPageProps) {
  const { handle } = await params;
  const proxy = await getProxyByHandle(handle);

  if (!proxy) notFound();

  let tokenData: TokenMarketData | null = null;
  let feeData: ClaimFeeData | null = null;
  let holders: TokenHolder[] = [];

  if (proxy.tokenAddress) {
    const tokenDataPromise = getTokenMarketData(proxy.tokenAddress).catch(
      () => null
    );

    const feePromise = (async () => {
      // Find the wallet: prefer creatorId lookup, fall back to xHandle
      let walletAddress: string | null = null;
      if (proxy.creatorId) {
        const [creator] = await db
          .select({ walletAddress: users.walletAddress })
          .from(users)
          .where(eq(users.id, proxy.creatorId))
          .limit(1);
        walletAddress = creator?.walletAddress ?? null;
      } else {
        const userByHandle = await getUserByXHandle(proxy.xHandle);
        walletAddress = userByHandle?.walletAddress ?? null;
      }

      if (!walletAddress) return null;

      const [fees, ethPrice] = await Promise.all([
        getTotalWethFees(
          proxy.tokenAddress!,
          walletAddress as `0x${string}`
        ),
        fetchEthPriceUsd(),
      ]);

      const totalEth = parseFloat(formatEther(fees.total));
      return {
        totalUsd: totalEth * ethPrice,
      };
    })().catch(() => null);

    [tokenData, feeData] = await Promise.all([tokenDataPromise, feePromise]);

    holders = await fetchTopHolders(proxy.tokenAddress).catch(() => []);
  }

  // Fetch creator info if claimed
  let creatorInfo: { xHandle: string | null; avatarUrl: string | null } | null =
    null;
  if (proxy.creatorId) {
    const [creator] = await db
      .select({
        xHandle: users.xHandle,
        avatarUrl: users.xProfileImageUrl,
      })
      .from(users)
      .where(eq(users.id, proxy.creatorId))
      .limit(1);
    if (creator) creatorInfo = creator;
  }

  return (
    <ClaimClient
      proxy={{
        id: proxy.id,
        xHandle: proxy.xHandle,
        displayName: proxy.displayName ?? proxy.xHandle,
        avatarUrl: proxy.avatarUrl ?? null,
        tokenAddress: proxy.tokenAddress ?? null,
        ticker: proxy.ticker ?? null,
        creatorId: proxy.creatorId ?? null,
      }}
      tokenData={tokenData}
      feeData={feeData}
      creatorInfo={creatorInfo}
      holders={holders}
    />
  );
}
