import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { getAdminStats, type StatsPeriod } from "@/lib/db/admin-queries";
import { getTotalLiveVolume } from "@/lib/chain/token";

const VALID_PERIODS = new Set(["24h", "7d", "30d", "all"]);

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") ?? "all";
  const safePeriod: StatsPeriod = VALID_PERIODS.has(period)
    ? (period as StatsPeriod)
    : "all";

  // Fetch DB stats and live DexScreener volume in parallel
  const [stats, liveVolume] = await Promise.all([
    getAdminStats(safePeriod),
    getTotalLiveVolume().catch(() => ({
      totalVolume24h: 0,
      totalLiquidity: 0,
      totalMarketCap: 0,
      tokenCount: 0,
    })),
  ]);

  return NextResponse.json({
    ...stats,
    // Override DB volume with live DexScreener data
    totalVolume24h: liveVolume.totalVolume24h,
    totalLiquidity: liveVolume.totalLiquidity,
    totalMarketCap: liveVolume.totalMarketCap,
    liveTokenCount: liveVolume.tokenCount,
  });
}
