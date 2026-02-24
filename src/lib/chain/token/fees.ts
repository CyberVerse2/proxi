import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import { db } from '@/lib/db';
import { proxies, users } from '@/lib/db/schema';
import { and, eq, isNotNull, isNull, sql } from 'drizzle-orm';
import { assertEnvPresent } from '@/lib/config/env';
import {
  ALCHEMY_API_KEY,
  DEPLOYER_PRIVATE_KEY,
  FEE_LOCKER_ABI,
  FEE_LOCKER_ADDRESS,
  PLATFORM_WALLET,
  RPC_URL,
  WETH_ADDRESS
} from './internal';

/**
 * Check available WETH fees for a given reward recipient address.
 */
export async function getAvailableWethFees(feeOwner: `0x${string}`): Promise<bigint> {
  const publicClient = createPublicClient({
    chain: base,
    transport: http(RPC_URL)
  });

  return publicClient.readContract({
    address: FEE_LOCKER_ADDRESS,
    abi: FEE_LOCKER_ABI,
    functionName: 'availableFees',
    args: [feeOwner, WETH_ADDRESS]
  });
}

/**
 * Claim WETH fees for a specific reward recipient.
 * Callable by anyone — the deployer wallet pays gas, but fees go to feeOwner.
 * Returns the tx hash, or null if no fees available.
 */
export async function claimWethFees(
  feeOwner: `0x${string}`
): Promise<{ txHash: string; amount: bigint } | null> {
  const available = await getAvailableWethFees(feeOwner);

  // Skip if dust (< 0.0001 WETH = 10^14 wei) — not worth the gas
  if (available < 100_000_000_000_000n) {
    return null;
  }

  if (!DEPLOYER_PRIVATE_KEY) {
    assertEnvPresent(['DEPLOYER_PRIVATE_KEY'], 'token.fees');
  }

  const account = privateKeyToAccount(DEPLOYER_PRIVATE_KEY!);
  const walletClient = createWalletClient({
    account,
    chain: base,
    transport: http(RPC_URL)
  });

  const txHash = await walletClient.writeContract({
    address: FEE_LOCKER_ADDRESS,
    abi: FEE_LOCKER_ABI,
    functionName: 'claim',
    args: [feeOwner, WETH_ADDRESS]
  });

  return { txHash, amount: available };
}

/**
 * Get all unique reward recipient wallets from deployed proxies.
 * Returns the platform wallet + every creator wallet that has a token.
 * For unclaimed proxies (no creatorId), looks up wallets by xHandle match.
 */
export async function getAllRewardRecipients(): Promise<`0x${string}`[]> {
  // Claimed proxies: join on creatorId
  const claimedResults = await db
    .select({
      walletAddress: users.walletAddress
    })
    .from(proxies)
    .innerJoin(users, eq(proxies.creatorId, users.id))
    .where(isNotNull(proxies.tokenAddress));

  // Unclaimed proxies: match users by xHandle
  const unclaimedResults = await db
    .select({
      walletAddress: users.walletAddress
    })
    .from(proxies)
    .innerJoin(users, sql`lower(${users.xHandle}) = lower(${proxies.xHandle})`)
    .where(and(isNotNull(proxies.tokenAddress), isNull(proxies.creatorId)));

  const wallets = new Set<`0x${string}`>();

  // Always include the platform wallet
  if (PLATFORM_WALLET) {
    wallets.add(PLATFORM_WALLET);
  }

  for (const row of [...claimedResults, ...unclaimedResults]) {
    if (row.walletAddress) {
      wallets.add(row.walletAddress as `0x${string}`);
    }
  }

  return Array.from(wallets);
}

export interface FeeBreakdown {
  /** Already claimed WETH (wei) */
  claimed: bigint;
  /** Sitting in the FeeLocker waiting to be claimed (wei) */
  unclaimed: bigint;
  /** claimed + unclaimed (wei) */
  total: bigint;
}

/**
 * Get total WETH fee earnings for a reward recipient.
 * Combines:
 *   - On-chain `availableFees()` for unclaimed WETH
 *   - Alchemy `getAssetTransfers` for already-claimed WETH
 *     (all WETH transfers FROM the FeeLocker TO the recipient)
 */
export async function getTotalWethFees(
  tokenAddress: string,
  feeRecipient: `0x${string}`
): Promise<FeeBreakdown> {
  void tokenAddress;
  const [unclaimed, claimed] = await Promise.all([
    getAvailableWethFees(feeRecipient).catch(() => 0n),
    fetchClaimedWethFromAlchemy(feeRecipient).catch(() => 0n)
  ]);

  return {
    claimed,
    unclaimed,
    total: claimed + unclaimed
  };
}

/**
 * Sum all WETH transfers from the ClankerFeeLocker to a recipient.
 * Uses Alchemy's `alchemy_getAssetTransfers` on Base mainnet.
 */
async function fetchClaimedWethFromAlchemy(recipient: `0x${string}`): Promise<bigint> {
  if (!ALCHEMY_API_KEY) return 0n;

  const url = `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'alchemy_getAssetTransfers',
      params: [
        {
          fromAddress: FEE_LOCKER_ADDRESS,
          toAddress: recipient,
          contractAddresses: [WETH_ADDRESS],
          category: ['erc20'],
          excludeZeroValue: true,
          order: 'desc',
          withMetadata: false
        }
      ]
    }),
    next: { revalidate: 300 } // cache for 5 min
  });

  if (!res.ok) return 0n;

  const data = await res.json();
  const transfers = data?.result?.transfers;
  if (!Array.isArray(transfers)) return 0n;

  let total = 0n;
  for (const tx of transfers) {
    // tx.value is a decimal number (e.g. 0.023041228812664845)
    // Convert to wei (18 decimals)
    if (tx.value != null) {
      const wei = BigInt(Math.round(tx.value * 1e18));
      total += wei;
    }
  }

  return total;
}
