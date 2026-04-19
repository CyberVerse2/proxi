import { notFound } from "next/navigation";
import { getProxyByHandle, getProxyMessageCount, getProxyReviews, getUserByXHandle } from "@/lib/db/queries";
import { AppShell } from "@/components/layout/app-shell";
import { ProxyDetail } from "./proxy-detail";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import {
  getProxyCreatorEarnings,
  getTokenMarketData,
  type TokenMarketData,
} from "@/lib/chain/token";
import { formatUnits } from "viem";
import { USDC_DECIMALS } from "@/lib/config/constants";

interface Props {
  params: Promise<{ handle: string }>;
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

      const fees = await getProxyCreatorEarnings(
        proxy.tokenAddress!,
        walletAddress as `0x${string}`,
      );
      return {
        claimed: formatUnits(fees.creatorShareClaimed, USDC_DECIMALS),
        unclaimed: formatUnits(fees.creatorShareAvailable, USDC_DECIMALS),
        total: formatUnits(fees.creatorShareTotal, USDC_DECIMALS),
        totalUsd: parseFloat(formatUnits(fees.creatorShareTotal, USDC_DECIMALS)),
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
