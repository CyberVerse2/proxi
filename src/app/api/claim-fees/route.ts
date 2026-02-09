import { NextResponse } from "next/server";
import { getProxyByHandle, getUserByXHandle } from "@/lib/db/queries";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { claimWethFees } from "@/lib/chain/token";
import { formatEther } from "viem";

/**
 * POST /api/claim-fees
 * Claim unclaimed WETH LP fees for a proxy's creator.
 *
 * Body: { handle: string }
 *
 * The FeeLocker.claim() function is callable by anyone — the deployer wallet
 * pays gas, and the WETH goes directly to the creator's wallet.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { handle } = body;

    if (!handle || typeof handle !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid handle" },
        { status: 400 },
      );
    }

    const proxy = await getProxyByHandle(handle);
    if (!proxy) {
      return NextResponse.json({ error: "Proxy not found" }, { status: 404 });
    }

    if (!proxy.tokenAddress) {
      return NextResponse.json(
        { error: "Token not deployed for this proxy" },
        { status: 400 },
      );
    }

    // Look up creator's wallet: prefer creatorId, fall back to xHandle
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

    if (!walletAddress) {
      return NextResponse.json(
        { error: "Creator wallet not found" },
        { status: 400 },
      );
    }

    const result = await claimWethFees(
      walletAddress as `0x${string}`,
    );

    if (!result) {
      return NextResponse.json({
        success: true,
        claimed: false,
        message: "No fees available to claim (below threshold)",
      });
    }

    return NextResponse.json({
      success: true,
      claimed: true,
      txHash: result.txHash,
      amount: formatEther(result.amount),
    });
  } catch (err) {
    console.error("Claim fees error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to claim fees",
      },
      { status: 500 },
    );
  }
}
