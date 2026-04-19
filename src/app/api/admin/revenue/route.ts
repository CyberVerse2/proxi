import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { getAllFounderRevenue } from "@/lib/chain/token";
import { formatUnits } from "viem";
import { USDC_DECIMALS } from "@/lib/config/constants";

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const revenues = await getAllFounderRevenue();
  const totals = {
    claimed: 0n,
    unclaimed: 0n,
    total: 0n,
    creatorAvailable: 0n,
    creatorPaidOut: 0n,
  };

  for (const item of revenues) {
    if (!item.breakdown) continue;
    totals.claimed += item.breakdown.claimed;
    totals.unclaimed += item.breakdown.unclaimed;
    totals.total += item.breakdown.total;
    totals.creatorAvailable += item.breakdown.creatorShareAvailable;
    totals.creatorPaidOut += item.breakdown.creatorSharePaidOut;
  }

  return NextResponse.json({
    claimedFounderFees: formatUnits(totals.claimed, USDC_DECIMALS),
    unclaimedFounderFees: formatUnits(totals.unclaimed, USDC_DECIMALS),
    totalFounderFees: formatUnits(totals.total, USDC_DECIMALS),
    creatorAvailable: formatUnits(totals.creatorAvailable, USDC_DECIMALS),
    creatorPaidOut: formatUnits(totals.creatorPaidOut, USDC_DECIMALS),
    totalRevenueUsd: parseFloat(formatUnits(totals.total, USDC_DECIMALS)),
  });
}
