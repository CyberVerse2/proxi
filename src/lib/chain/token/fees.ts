import { and, desc, eq, sql } from 'drizzle-orm';
import { createWalletClient, formatUnits, http } from 'viem';
import { bsc } from 'viem/chains';
import { db } from '@/lib/db';
import { creatorEarningsPayouts, proxies, users } from '@/lib/db/schema';
import { CREATOR_FEE_PERCENT, PLATFORM_FEE_PERCENT, USDC_ADDRESS, USDC_DECIMALS } from '@/lib/config/constants';
import { getBscPublicClient, getFounderAccount, PLATFORM_WALLET, PROXI_FOUNDER_WALLET } from '@/lib/chain/fourmeme/client';
import { BSC_RPC_URL, ERC20_ABI, TAX_TOKEN_ABI, ZERO_ADDRESS } from '@/lib/chain/fourmeme/constants';

export interface CreatorEarningsBreakdown {
  claimed: bigint;
  unclaimed: bigint;
  total: bigint;
  totalUsd: number;
  quoteTokenAddress: string | null;
  creatorShareClaimed: bigint;
  creatorShareUnclaimed: bigint;
  creatorShareTotal: bigint;
  creatorSharePaidOut: bigint;
  creatorShareAvailable: bigint;
}

export function calculateCreatorShareBreakdown(params: {
  claimed: bigint;
  unclaimed: bigint;
  creatorSharePaidOut: bigint;
}) {
  const { claimed, unclaimed, creatorSharePaidOut } = params;
  const creatorShareClaimed = (claimed * BigInt(CREATOR_FEE_PERCENT)) / 100n;
  const creatorShareUnclaimed = (unclaimed * BigInt(CREATOR_FEE_PERCENT)) / 100n;
  const creatorShareTotal = creatorShareClaimed + creatorShareUnclaimed;
  const creatorShareAvailable =
    creatorShareTotal > creatorSharePaidOut ? creatorShareTotal - creatorSharePaidOut : 0n;

  return {
    creatorShareClaimed,
    creatorShareUnclaimed,
    creatorShareTotal,
    creatorShareAvailable,
  };
}

async function getQuoteTokenDecimals(quoteTokenAddress: string | null) {
  if (!quoteTokenAddress || quoteTokenAddress === ZERO_ADDRESS) return 18;
  if (quoteTokenAddress.toLowerCase() === USDC_ADDRESS.toLowerCase()) return USDC_DECIMALS;

  const publicClient = getBscPublicClient();
  const decimals = await publicClient.readContract({
    address: quoteTokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'decimals',
  });
  return Number(decimals);
}

export async function getFounderFeeBreakdown(tokenAddress: string): Promise<CreatorEarningsBreakdown> {
  const publicClient = getBscPublicClient();
  const founderAddress = (PROXI_FOUNDER_WALLET ?? PLATFORM_WALLET) as `0x${string}` | undefined;

  if (!founderAddress) {
    return {
      claimed: 0n,
      unclaimed: 0n,
      total: 0n,
      totalUsd: 0,
      quoteTokenAddress: USDC_ADDRESS,
      creatorShareClaimed: 0n,
      creatorShareUnclaimed: 0n,
      creatorShareTotal: 0n,
      creatorSharePaidOut: 0n,
      creatorShareAvailable: 0n,
    };
  }

  const [claimed, unclaimed, quoteTokenAddress, paidOutResult] = await Promise.all([
    publicClient.readContract({
      address: tokenAddress as `0x${string}`,
      abi: TAX_TOKEN_ABI,
      functionName: 'claimedFee',
      args: [founderAddress],
    }).catch(() => 0n),
    publicClient.readContract({
      address: tokenAddress as `0x${string}`,
      abi: TAX_TOKEN_ABI,
      functionName: 'claimableFee',
      args: [founderAddress],
    }).catch(() => 0n),
    publicClient.readContract({
      address: tokenAddress as `0x${string}`,
      abi: TAX_TOKEN_ABI,
      functionName: 'quote',
    }).catch(() => ZERO_ADDRESS),
    db
      .select({
        total: sql<string>`coalesce(sum(${creatorEarningsPayouts.creatorAmount}), '0')`,
      })
      .from(creatorEarningsPayouts)
      .where(eq(creatorEarningsPayouts.tokenAddress, tokenAddress)),
  ]);

  const total = claimed + unclaimed;
  const creatorSharePaidOut = BigInt(paidOutResult[0]?.total ?? '0');
  const {
    creatorShareClaimed,
    creatorShareUnclaimed,
    creatorShareTotal,
    creatorShareAvailable,
  } = calculateCreatorShareBreakdown({
    claimed,
    unclaimed,
    creatorSharePaidOut,
  });
  const quoteToken = quoteTokenAddress === ZERO_ADDRESS ? null : quoteTokenAddress;
  const decimals = await getQuoteTokenDecimals(quoteToken);
  const totalUsd =
    quoteToken?.toLowerCase() === USDC_ADDRESS.toLowerCase() || quoteToken === null
      ? parseFloat(formatUnits(total, decimals))
      : 0;

  return {
    claimed,
    unclaimed,
    total,
    totalUsd,
    quoteTokenAddress: quoteToken,
    creatorShareClaimed,
    creatorShareUnclaimed,
    creatorShareTotal,
    creatorSharePaidOut,
    creatorShareAvailable,
  };
}

export async function getProxyCreatorEarnings(
  tokenAddress: string,
  creatorWalletAddress: `0x${string}`
): Promise<CreatorEarningsBreakdown> {
  void creatorWalletAddress;
  return getFounderFeeBreakdown(tokenAddress);
}

export async function claimCreatorEarnings(params: {
  proxyId: string;
  tokenAddress: string;
  creatorWalletAddress: `0x${string}`;
}) {
  const { proxyId, tokenAddress, creatorWalletAddress } = params;
  const publicClient = getBscPublicClient();
  const founderAccount = getFounderAccount();
  const founderWallet = createWalletClient({
    account: founderAccount,
    chain: bsc,
    transport: http(BSC_RPC_URL),
  });

  const before = await getFounderFeeBreakdown(tokenAddress);
  if (before.creatorShareAvailable <= 0n) {
    return null;
  }

  if (before.unclaimed > 0n) {
    const claimHash = await founderWallet.writeContract({
      address: tokenAddress as `0x${string}`,
      abi: TAX_TOKEN_ABI,
      functionName: 'claimFee',
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash: claimHash });
    if (receipt.status !== 'success') {
      throw new Error('Failed to claim founder fee from tax token');
    }
  }

  const after = await getFounderFeeBreakdown(tokenAddress);
  const creatorDue = after.creatorShareAvailable;
  if (creatorDue <= 0n) {
    return null;
  }

  let payoutHash: `0x${string}`;
  if (!after.quoteTokenAddress || after.quoteTokenAddress === ZERO_ADDRESS) {
    payoutHash = await founderWallet.sendTransaction({
      to: creatorWalletAddress,
      value: creatorDue,
    });
  } else {
    payoutHash = await founderWallet.writeContract({
      address: after.quoteTokenAddress as `0x${string}`,
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [creatorWalletAddress, creatorDue],
    });
  }

  const payoutReceipt = await publicClient.waitForTransactionReceipt({ hash: payoutHash });
  if (payoutReceipt.status !== 'success') {
    throw new Error('Failed to transfer creator earnings');
  }

  const creatorAmount = creatorDue;
  const platformAmount = (creatorAmount * BigInt(PLATFORM_FEE_PERCENT)) / BigInt(CREATOR_FEE_PERCENT);
  const grossAmount = creatorAmount + platformAmount;

  await db.insert(creatorEarningsPayouts).values({
    proxyId,
    tokenAddress,
    creatorWalletAddress,
    quoteTokenAddress: after.quoteTokenAddress,
    grossAmount: grossAmount.toString(),
    creatorAmount: creatorAmount.toString(),
    platformAmount: platformAmount.toString(),
    txHash: payoutHash,
  });

  return {
    txHash: payoutHash,
    creatorAmount,
    grossAmount,
    quoteTokenAddress: after.quoteTokenAddress,
  };
}

export async function getAllFounderRevenue() {
  const tokens = await db
    .select({
      proxyId: proxies.id,
      tokenAddress: proxies.tokenAddress,
      creatorId: proxies.creatorId,
    })
    .from(proxies)
    .where(and(sql`${proxies.tokenAddress} is not null`, sql`${proxies.tokenAddress} <> ''`))
    .orderBy(desc(proxies.updatedAt));

  const results = await Promise.all(
    tokens
      .filter((row): row is typeof row & { tokenAddress: string } => !!row.tokenAddress)
      .map(async (row) => ({
        proxyId: row.proxyId,
        creatorId: row.creatorId,
        tokenAddress: row.tokenAddress,
        breakdown: await getFounderFeeBreakdown(row.tokenAddress).catch(() => null),
      }))
  );

  return results.filter((row) => row.breakdown !== null);
}

export async function getCreatorWalletForProxy(proxyId: string) {
  const [proxy] = await db
    .select({
      creatorId: proxies.creatorId,
      xHandle: proxies.xHandle,
    })
    .from(proxies)
    .where(eq(proxies.id, proxyId))
    .limit(1);

  if (!proxy) return null;

  if (proxy.creatorId) {
    const [creator] = await db
      .select({ walletAddress: users.walletAddress })
      .from(users)
      .where(eq(users.id, proxy.creatorId))
      .limit(1);
    return creator?.walletAddress ?? null;
  }

  const [user] = await db
    .select({ walletAddress: users.walletAddress })
    .from(users)
    .where(sql`lower(${users.xHandle}) = lower(${proxy.xHandle})`)
    .limit(1);
  return user?.walletAddress ?? null;
}
