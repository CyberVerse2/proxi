import { notFound } from "next/navigation";
import { getProxyByHandle, getProxyMessageCount, getProxyReviews, getUserByXHandle } from "@/lib/db/queries";
import { AppShell } from "@/components/layout/app-shell";
import { ProxyDetail } from "./proxy-detail";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  getTotalWethFees,
  getTokenMarketData,
  type TokenMarketData,
} from "@/lib/chain/token";
import { formatEther } from "viem";

interface Props {
  params: Promise<{ handle: string }>;
}

async function fetchEthPriceUsd(): Promise<number> {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd",
      { next: { revalidate: 300 } },
    );
    if (!res.ok) return 0;
    const data = await res.json();
    return data?.ethereum?.usd ?? 0;
  } catch {
    return 0;
  }
}

export interface FeeData {
  claimed: string;
  unclaimed: string;
  total: string;
  totalUsd: number;
}

export default async function ProxyDetailPage({ params }: Props) {
  const { handle } = await params;
  const proxy = await getProxyByHandle(handle);

  if (!proxy) return notFound();

  // Fetch message count, reviews, token market data + fee earnings in parallel
  let feeData: FeeData | null = null;
  let tokenData: TokenMarketData | null = null;
  let liveMessageCount = 0;

  const messageCountPromise = getProxyMessageCount(proxy.id);
  const reviewsPromise = getProxyReviews(proxy.id);

  if (proxy.tokenAddress) {
    const tokenDataPromise = getTokenMarketData(proxy.tokenAddress).catch(
      () => null,
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
          walletAddress as `0x${string}`,
        ),
        fetchEthPriceUsd(),
      ]);

      const totalEth = parseFloat(formatEther(fees.total));
      return {
        claimed: formatEther(fees.claimed),
        unclaimed: formatEther(fees.unclaimed),
        total: formatEther(fees.total),
        totalUsd: totalEth * ethPrice,
      };
    })().catch(() => null);

    [tokenData, feeData, liveMessageCount] = await Promise.all([
      tokenDataPromise,
      feePromise,
      messageCountPromise,
    ]);
  } else {
    liveMessageCount = await messageCountPromise;
  }

  const rawReviews = await reviewsPromise;
  const reviews = rawReviews.map((r) => ({
    id: r.id,
    score: r.score,
    text: r.reviewText,
    createdAt: r.createdAt.toISOString(),
    name: r.userName ?? r.userHandle ?? "Anonymous",
    handle: r.userHandle,
    avatar: r.userAvatar,
  }));

  return (
    <AppShell>
      <div className="pt-8">
        <ProxyDetail
          proxy={proxy}
          feeData={feeData}
          tokenData={tokenData}
          liveMessageCount={liveMessageCount}
          reviews={reviews}
        />
      </div>
    </AppShell>
  );
}
