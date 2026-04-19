import { NextResponse } from "next/server";
import { getProxyByHandle } from "@/lib/db/queries";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { claimCreatorEarnings } from "@/lib/chain/token";
import { getAuthUser, getPrivyWalletAddress } from "@/lib/auth/privy";
import { formatUnits } from "viem";
import { USDC_DECIMALS } from "@/lib/config/constants";

/**
 * POST /api/claim-fees
 * Claim accrued creator earnings for a proxy.
 *
 * Body: { handle: string }
 */
export async function POST(request: Request) {
  try {
    const authToken = request.headers.get("authorization")?.replace("Bearer ", "");
    const authUser = await getAuthUser(authToken);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    const walletAddress = await getPrivyWalletAddress(authUser.userId);
    if (!walletAddress) {
      return NextResponse.json({ error: "Creator wallet not found" }, { status: 400 });
    }

    if (proxy.creatorId) {
      const [creator] = await db
        .select({ walletAddress: users.walletAddress, privyId: users.privyId })
        .from(users)
        .where(eq(users.id, proxy.creatorId))
        .limit(1);
      if (!creator || creator.privyId !== authUser.userId || creator.walletAddress?.toLowerCase() !== walletAddress.toLowerCase()) {
        return NextResponse.json({ error: "You are not the owner of this proxy" }, { status: 403 });
      }
    }

    const result = await claimCreatorEarnings({
      proxyId: proxy.id,
      tokenAddress: proxy.tokenAddress,
      creatorWalletAddress: walletAddress as `0x${string}`,
    });

    if (!result) {
      return NextResponse.json({
        success: true,
        claimed: false,
        message: "No creator earnings available to claim yet",
      });
    }

    return NextResponse.json({
      success: true,
      claimed: true,
      txHash: result.txHash,
      amount: formatUnits(result.creatorAmount, USDC_DECIMALS),
      asset: "USDC",
    });
  } catch (err) {
    console.error("Claim fees error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to claim creator earnings",
      },
      { status: 500 },
    );
  }
}
