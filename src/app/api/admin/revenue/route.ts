import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { getAvailableWethFees } from "@/lib/chain/token";
import { formatEther } from "viem";

const PLATFORM_WALLET = process.env.PLATFORM_WALLET_ADDRESS as `0x${string}` | undefined;
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY ?? "";

/** ClankerFeeLocker on Base mainnet (v4) */
const FEE_LOCKER_ADDRESS = "0xF3622742b1E446D92e45E22923Ef11C2fcD55D68";
/** Wrapped ETH on Base */
const WETH_ADDRESS = "0x4200000000000000000000000000000000000006";

/**
 * Fetch already-claimed WETH transfers from FeeLocker to the platform wallet
 * using Alchemy's getAssetTransfers.
 */
async function fetchClaimedWeth(recipient: string): Promise<bigint> {
  if (!ALCHEMY_API_KEY) return 0n;

  const url = `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "alchemy_getAssetTransfers",
      params: [
        {
          fromAddress: FEE_LOCKER_ADDRESS,
          toAddress: recipient,
          contractAddresses: [WETH_ADDRESS],
          category: ["erc20"],
          excludeZeroValue: true,
          order: "desc",
          withMetadata: false,
        },
      ],
    }),
  });

  if (!res.ok) return 0n;
  const data = await res.json();
  const transfers = data?.result?.transfers;
  if (!Array.isArray(transfers)) return 0n;

  let total = 0n;
  for (const tx of transfers) {
    if (tx.value != null) {
      total += BigInt(Math.round(tx.value * 1e18));
    }
  }
  return total;
}

/**
 * Fetch current ETH price in USD from Alchemy.
 */
async function getEthPriceUsd(): Promise<number> {
  if (!ALCHEMY_API_KEY) return 0;

  try {
    const res = await fetch(
      `https://api.g.alchemy.com/prices/v1/${ALCHEMY_API_KEY}/tokens/by-symbol`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbols: ["ETH"] }),
      }
    );
    if (!res.ok) return 0;
    const data = await res.json();
    const price = data?.data?.[0]?.prices?.[0]?.value;
    return price ? parseFloat(price) : 0;
  } catch {
    return 0;
  }
}

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  if (!PLATFORM_WALLET) {
    return NextResponse.json({
      claimedWeth: "0",
      unclaimedWeth: "0",
      totalWeth: "0",
      ethPriceUsd: 0,
      totalRevenueUsd: 0,
    });
  }

  const [unclaimed, claimed, ethPrice] = await Promise.all([
    getAvailableWethFees(PLATFORM_WALLET).catch(() => 0n),
    fetchClaimedWeth(PLATFORM_WALLET).catch(() => 0n),
    getEthPriceUsd(),
  ]);

  const totalWeth = claimed + unclaimed;
  const totalEth = parseFloat(formatEther(totalWeth));
  const totalRevenueUsd = totalEth * ethPrice;

  return NextResponse.json({
    claimedWeth: formatEther(claimed),
    unclaimedWeth: formatEther(unclaimed),
    totalWeth: formatEther(totalWeth),
    ethPriceUsd: ethPrice,
    totalRevenueUsd,
  });
}
