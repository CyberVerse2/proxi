/**
 * Token deployment via Clanker SDK (v4) on Base chain.
 * Uses a server-side deployer wallet to sign transactions directly on-chain.
 * https://clanker.gitbook.io/clanker-documentation/sdk/v4.0.0
 */

import { Clanker } from 'clanker-sdk/v4';
import { createWalletClient, createPublicClient, http, encodeFunctionData, parseAbi } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import { db } from '@/lib/db';
import { proxyTokens, proxies, users } from '@/lib/db/schema';
import { eq, and, isNotNull, isNull, sql } from 'drizzle-orm';
import {
  USDC_DECIMALS,
  USDC_ADDRESS,
  SLIPPAGE_BPS,
  BASE_CHAIN_ID,
  ZX_API_BASE
} from '@/lib/config/constants';
import { getWalletIdByAddress, sendTransactionViaPrivy } from '@/lib/auth/privy';

/* ────────────────────────────────────────────────────────── */
/*  Deployer wallet setup                                     */
/* ────────────────────────────────────────────────────────── */

const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY as `0x${string}` | undefined;

const PLATFORM_WALLET = process.env.PLATFORM_WALLET_ADDRESS as `0x${string}`;

const RPC_URL = process.env.NEXT_PUBLIC_BASE_RPC_URL ?? 'https://mainnet.base.org';

function getClankerClient() {
  if (!DEPLOYER_PRIVATE_KEY) {
    throw new Error('DEPLOYER_PRIVATE_KEY not configured. Add it to your .env file.');
  }

  const account = privateKeyToAccount(DEPLOYER_PRIVATE_KEY);
  const publicClient = createPublicClient({
    chain: base,
    transport: http(RPC_URL)
  });
  const wallet = createWalletClient({
    account,
    chain: base,
    transport: http(RPC_URL)
  });

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- viem minor version mismatch with SDK
  return {
    clanker: new Clanker({ publicClient: publicClient as any, wallet: wallet as any }),
    account
  };
}

/* ────────────────────────────────────────────────────────── */
/*  Deploy                                                    */
/* ────────────────────────────────────────────────────────── */

interface DeployTokenParams {
  name: string;
  symbol: string;
  proxyId: string;
  /** Creator's wallet – set as reward recipient (earns LP fees) */
  creatorAddress: string;
  imageUrl?: string;
  description?: string;
}

interface TokenDeployResult {
  tokenAddress: string;
  ticker: string;
  txHash: string;
  success: boolean;
  chain: string;
}

/**
 * Deploy a proxy token on Base via the Clanker SDK.
 *
 * Admin architecture:
 *  - tokenAdmin      = deployer wallet (controls metadata, image, verify)
 *  - rewards admin   = deployer wallet (can redirect reward recipients)
 *  - rewards recipient = creator wallet (earns LP fees)
 */
export async function deployProxyToken(params: DeployTokenParams): Promise<TokenDeployResult> {
  const { name, symbol, proxyId, creatorAddress, imageUrl, description } = params;

  const { clanker, account } = getClankerClient();
  const deployerAddress = account.address;

  const { txHash, waitForTransaction, error } = await clanker.deploy({
    name,
    symbol,
    image: imageUrl ?? '',
    tokenAdmin: deployerAddress,
    metadata: {
      description: description ?? `Digital clone of ${name}. Chat with me at proxi.fun`
    },
    context: {
      interface: 'Proxi'
    },
    rewards: {
      recipients: [
        {
          admin: deployerAddress,
          recipient: creatorAddress as `0x${string}`, // Creator — 50%
          bps: 5000,
          token: 'Both'
        },
        {
          admin: deployerAddress,
          recipient: PLATFORM_WALLET, // Proxi treasury — 50%
          bps: 5000,
          token: 'Both'
        }
      ]
    },
    fees: {
      type: 'static',
      clankerFee: 100, // 1% in bps
      pairedFee: 100 // 1% in bps
    },
    vault: {
      percentage: 30, // 30% of total supply
      lockupDuration: 15_552_000, // 6 months (180 days in seconds)
      vestingDuration: 15_552_000, // linear vesting over the full lockup period
      recipient: creatorAddress as `0x${string}` // Creator receives the vaulted tokens
    }
  });

  if (error) {
    throw new Error(`Clanker deployment failed: ${error.message}`);
  }

  if (!txHash || !waitForTransaction) {
    throw new Error('Clanker deployment failed: no transaction returned');
  }

  // Wait for on-chain confirmation
  const txResult = await waitForTransaction();
  if (txResult.error) {
    throw new Error(`Clanker tx confirmation failed: ${txResult.error.message}`);
  }

  const tokenAddress = txResult.address;

  // Store in DB
  await db.insert(proxyTokens).values({
    proxyId,
    tokenAddress,
    chain: 'base',
    metadata: { txHash, deployerAddress }
  });

  // Update proxy record (save token address + ticker)
  await db
    .update(proxies)
    .set({ tokenAddress, ticker: symbol, updatedAt: new Date() })
    .where(eq(proxies.id, proxyId));

  return {
    tokenAddress,
    ticker: symbol,
    txHash,
    success: true,
    chain: 'base'
  };
}

/* ────────────────────────────────────────────────────────── */
/*  Fee claiming (ClankerFeeLocker)                           */
/* ────────────────────────────────────────────────────────── */

/** ClankerFeeLocker on Base mainnet (v4) */
const FEE_LOCKER_ADDRESS = '0xF3622742b1E446D92e45E22923Ef11C2fcD55D68' as const;

/** Wrapped ETH on Base */
const WETH_ADDRESS = '0x4200000000000000000000000000000000000006' as const;

const FEE_LOCKER_ABI = [
  {
    name: 'claim',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'feeOwner', type: 'address' },
      { name: 'token', type: 'address' }
    ],
    outputs: []
  },
  {
    name: 'availableFees',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'feeOwner', type: 'address' },
      { name: 'token', type: 'address' }
    ],
    outputs: [{ name: '', type: 'uint256' }]
  }
] as const;

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
    throw new Error('DEPLOYER_PRIVATE_KEY not configured');
  }

  const account = privateKeyToAccount(DEPLOYER_PRIVATE_KEY);
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

/* ────────────────────────────────────────────────────────── */
/*  Total fee earnings (claimed + unclaimed)                   */
/* ────────────────────────────────────────────────────────── */

const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY ?? '';

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

/* ────────────────────────────────────────────────────────── */
/*  Token market data (Alchemy + DexScreener)                  */
/* ────────────────────────────────────────────────────────── */

export interface TokenMarketData {
  /* Metadata */
  name: string | null;
  symbol: string | null;
  decimals: number | null;
  logo: string | null;
  totalSupply: string | null;

  /* Price */
  priceUsd: number;
  priceChange24h: number;
  marketCap: number;
  volume24h: number;
  liquidity: number;

  /* DEX info */
  pairAddress: string | null;
  dexUrl: string | null;

  /* Historical prices (last 30 data points) */
  priceHistory: { timestamp: number; price: number }[];
}

/**
 * Fetch comprehensive token market data.
 * Uses Alchemy for metadata + price, DexScreener for DEX-specific data
 * (volume, liquidity, pair info), and Alchemy Prices API for history.
 */
export async function getTokenMarketData(tokenAddress: string): Promise<TokenMarketData> {
  const [metadata, alchemyPrice, dexData, priceHistory] = await Promise.all([
    fetchAlchemyTokenMetadata(tokenAddress).catch(() => null),
    fetchAlchemyTokenPrice(tokenAddress).catch(() => null),
    fetchDexScreenerData(tokenAddress).catch(() => null),
    fetchAlchemyPriceHistory(tokenAddress).catch(() => [])
  ]);

  // Prefer Alchemy price, fall back to DexScreener
  const priceUsd = alchemyPrice ?? (dexData?.priceUsd ? parseFloat(dexData.priceUsd) : 0);

  return {
    name: metadata?.name ?? dexData?.name ?? null,
    symbol: metadata?.symbol ?? dexData?.symbol ?? null,
    decimals: metadata?.decimals ?? null,
    logo: metadata?.logo ?? dexData?.imageUrl ?? null,
    totalSupply: dexData?.fdv && priceUsd > 0 ? String(Math.round(dexData.fdv / priceUsd)) : null,

    priceUsd,
    priceChange24h: dexData?.priceChange24h ?? 0,
    marketCap: dexData?.marketCap ?? 0,
    volume24h: dexData?.volume24h ?? 0,
    liquidity: dexData?.liquidity ?? 0,

    pairAddress: dexData?.pairAddress ?? null,
    dexUrl: dexData?.dexUrl ?? null,

    priceHistory
  };
}

/* ─── Alchemy: Token Metadata ─── */

async function fetchAlchemyTokenMetadata(tokenAddress: string) {
  if (!ALCHEMY_API_KEY) return null;

  const res = await fetch(`https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'alchemy_getTokenMetadata',
      params: [tokenAddress]
    }),
    next: { revalidate: 3600 } // cache 1 hour — metadata rarely changes
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data?.result as {
    name: string;
    symbol: string;
    decimals: number;
    logo: string | null;
  } | null;
}

/* ─── Alchemy: Token Price by Address ─── */

async function fetchAlchemyTokenPrice(tokenAddress: string): Promise<number | null> {
  if (!ALCHEMY_API_KEY) return null;

  const res = await fetch(
    `https://api.g.alchemy.com/prices/v1/${ALCHEMY_API_KEY}/tokens/by-address`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        addresses: [{ network: 'base-mainnet', address: tokenAddress }]
      }),
      next: { revalidate: 60 } // cache 1 min
    }
  );

  if (!res.ok) return null;
  const data = await res.json();
  const token = data?.data?.[0];
  if (!token?.prices?.[0]?.value) return null;
  return parseFloat(token.prices[0].value);
}

/* ─── Alchemy: Historical Prices (30 days) ─── */

async function fetchAlchemyPriceHistory(
  tokenAddress: string
): Promise<{ timestamp: number; price: number }[]> {
  if (!ALCHEMY_API_KEY) return [];

  const endTime = new Date().toISOString();
  const startTime = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const res = await fetch(
    `https://api.g.alchemy.com/prices/v1/${ALCHEMY_API_KEY}/tokens/historical`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        symbol: undefined,
        address: tokenAddress,
        network: 'base-mainnet',
        startTime,
        endTime,
        interval: '1d'
      }),
      next: { revalidate: 3600 } // cache 1 hour
    }
  );

  if (!res.ok) return [];
  const data = await res.json();
  const history = data?.data?.prices ?? data?.data ?? [];

  if (!Array.isArray(history)) return [];

  return history
    .filter((p: { value?: string; timestamp?: string }) => p.value && p.timestamp)
    .map((p: { value: string; timestamp: string }) => ({
      timestamp: new Date(p.timestamp).getTime(),
      price: parseFloat(p.value)
    }));
}

/* ─── DexScreener: DEX-specific data ─── */

async function fetchDexScreenerData(tokenAddress: string) {
  const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`, {
    next: { revalidate: 60 }
  });
  if (!res.ok) return null;

  const data = await res.json();
  const pair = data.pairs?.[0];
  if (!pair) return null;

  return {
    name: pair.baseToken?.name as string | undefined,
    symbol: pair.baseToken?.symbol as string | undefined,
    imageUrl: pair.info?.imageUrl as string | undefined,
    priceUsd: pair.priceUsd as string | undefined,
    priceChange24h: pair.priceChange?.h24 ? parseFloat(pair.priceChange.h24) : 0,
    marketCap: pair.marketCap ? parseFloat(pair.marketCap) : 0,
    fdv: pair.fdv ? parseFloat(pair.fdv) : 0,
    volume24h: pair.volume?.h24 ? parseFloat(pair.volume.h24) : 0,
    liquidity: pair.liquidity?.usd ? parseFloat(pair.liquidity.usd) : 0,
    pairAddress: pair.pairAddress as string | undefined,
    dexUrl: pair.url as string | undefined
  };
}

/* ─── DexScreener: Batch volume for multiple tokens ─── */

interface DexScreenerPair {
  baseToken?: { address?: string };
  volume?: Record<string, number>;
  liquidity?: { usd?: number };
  marketCap?: number;
  priceUsd?: string;
}

export interface BatchTokenVolume {
  tokenAddress: string;
  volume24h: number;
  liquidity: number;
  marketCap: number;
  priceUsd: number;
}

/**
 * Fetch live volume data from DexScreener for multiple tokens in batch.
 * Uses the /tokens/v1/base/{addresses} endpoint (up to 30 per request).
 * For each token, picks the highest-liquidity pair to avoid double-counting.
 */
export async function fetchBatchDexScreenerData(
  tokenAddresses: string[]
): Promise<BatchTokenVolume[]> {
  if (tokenAddresses.length === 0) return [];

  const results: BatchTokenVolume[] = [];
  const BATCH_SIZE = 30;

  // Split into batches of 30
  for (let i = 0; i < tokenAddresses.length; i += BATCH_SIZE) {
    const batch = tokenAddresses.slice(i, i + BATCH_SIZE);
    const joined = batch.join(',');

    try {
      const res = await fetch(
        `https://api.dexscreener.com/tokens/v1/base/${joined}`,
        { next: { revalidate: 60 } }
      );
      if (!res.ok) continue;

      const pairs: DexScreenerPair[] = await res.json();
      if (!Array.isArray(pairs)) continue;

      // Group pairs by base token address, pick highest-liquidity pair per token
      const bestByToken = new Map<string, DexScreenerPair>();
      for (const pair of pairs) {
        const addr = pair.baseToken?.address?.toLowerCase();
        if (!addr) continue;
        const existing = bestByToken.get(addr);
        const existingLiq = existing?.liquidity?.usd ?? 0;
        const currentLiq = pair.liquidity?.usd ?? 0;
        if (!existing || currentLiq > existingLiq) {
          bestByToken.set(addr, pair);
        }
      }

      for (const [addr, pair] of bestByToken) {
        results.push({
          tokenAddress: addr,
          volume24h: pair.volume?.h24 ?? 0,
          liquidity: pair.liquidity?.usd ?? 0,
          marketCap: pair.marketCap ?? 0,
          priceUsd: pair.priceUsd ? parseFloat(pair.priceUsd) : 0,
        });
      }
    } catch (err) {
      console.error('[token] DexScreener batch fetch error:', err);
    }
  }

  return results;
}

/**
 * Fetch the aggregate 24h volume across all Proxi tokens from DexScreener.
 * Queries the DB for all token addresses, then batch-fetches from DexScreener.
 */
export async function getTotalLiveVolume(): Promise<{
  totalVolume24h: number;
  totalLiquidity: number;
  totalMarketCap: number;
  tokenCount: number;
}> {
  // Get all token addresses from DB
  const tokens = await db
    .select({ tokenAddress: proxyTokens.tokenAddress })
    .from(proxyTokens);

  const addresses = tokens
    .map((t) => t.tokenAddress)
    .filter(Boolean);

  if (addresses.length === 0) {
    return { totalVolume24h: 0, totalLiquidity: 0, totalMarketCap: 0, tokenCount: 0 };
  }

  const data = await fetchBatchDexScreenerData(addresses);

  let totalVolume24h = 0;
  let totalLiquidity = 0;
  let totalMarketCap = 0;

  for (const item of data) {
    totalVolume24h += item.volume24h;
    totalLiquidity += item.liquidity;
    totalMarketCap += item.marketCap;
  }

  return {
    totalVolume24h,
    totalLiquidity,
    totalMarketCap,
    tokenCount: data.length,
  };
}

/* ────────────────────────────────────────────────────────── */
/*  Tokens-per-message pricing (0x price API)                 */
/* ────────────────────────────────────────────────────────── */

const ZX_API_KEY = process.env['0X_API_KEY'] ?? '';

/**
 * Call 0x price API to find how many tokens the proxy's chat price buys (= 1 message).
 * Returns the human-readable token amount (e.g. 1234.56 tokens).
 */
export async function getTokensPerMessage(
  tokenAddress: string,
  pricePerMessage: number
): Promise<number> {
  if (!ZX_API_KEY) return 0;
  try {
    const sellAmount = BigInt(Math.round(pricePerMessage * 10 ** USDC_DECIMALS)).toString();
    const params = new URLSearchParams({
      chainId: String(BASE_CHAIN_ID),
      sellToken: USDC_ADDRESS,
      buyToken: tokenAddress,
      sellAmount,
      slippageBps: SLIPPAGE_BPS
    });
    const url = `${ZX_API_BASE}/price?${params}`;
    const res = await fetch(url, {
      headers: { '0x-api-key': ZX_API_KEY, '0x-version': 'v2' },
      next: { revalidate: 60 }
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error('[token] 0x price API error:', res.status, errText);
      return 0;
    }
    const data = await res.json();
    return Number(data.buyAmount) / 1e18;
  } catch {
    return 0;
  }
}

/**
 * Same as getTokensPerMessage but returns the raw bigint amount (18 decimals)
 * suitable for ERC-20 transfer calls.
 */
export async function getRawTokensPerMessage(
  tokenAddress: string,
  pricePerMessage: number
): Promise<bigint> {
  if (!ZX_API_KEY) return 0n;
  try {
    const sellAmount = BigInt(Math.round(pricePerMessage * 10 ** USDC_DECIMALS)).toString();
    const params = new URLSearchParams({
      chainId: String(BASE_CHAIN_ID),
      sellToken: USDC_ADDRESS,
      buyToken: tokenAddress,
      sellAmount,
      slippageBps: SLIPPAGE_BPS
    });
    const url = `${ZX_API_BASE}/price?${params}`;
    const res = await fetch(url, {
      headers: { '0x-api-key': ZX_API_KEY, '0x-version': 'v2' },
      next: { revalidate: 60 }
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error('[token] 0x price API error:', res.status, errText);
      return 0n;
    }
    const data = await res.json();
    return BigInt(data.buyAmount ?? '0');
  } catch {
    return 0n;
  }
}

/* ────────────────────────────────────────────────────────── */
/*  Server-side token transfer (via Privy embedded wallet)    */
/* ────────────────────────────────────────────────────────── */

const ERC20_TRANSFER_ABI = parseAbi([
  'function transfer(address to, uint256 amount) returns (bool)'
]);

/**
 * Transfer ERC-20 tokens from a user's Privy embedded wallet to a recipient.
 * Uses Privy's server-side wallet RPC — no client interaction required.
 *
 * @param userWalletAddress  The user's on-chain wallet address
 * @param tokenAddress       The ERC-20 token contract address
 * @param amount             Raw token amount (18 decimals)
 * @param recipient          Destination wallet address
 * @returns                  The transaction hash
 */
export async function transferTokensFromUser(
  userWalletAddress: string,
  tokenAddress: string,
  amount: bigint,
  recipient: string
): Promise<{ hash: string }> {
  // 1. Look up the Privy wallet ID
  const walletId = await getWalletIdByAddress(userWalletAddress);
  if (!walletId) {
    throw new Error(`Could not find Privy wallet for address ${userWalletAddress}`);
  }

  // 2. Encode the ERC-20 transfer call
  const transferData = encodeFunctionData({
    abi: ERC20_TRANSFER_ABI,
    functionName: 'transfer',
    args: [recipient as `0x${string}`, amount]
  });

  // 3. Send via Privy server-side RPC
  const result = await sendTransactionViaPrivy(walletId, tokenAddress, transferData);

  if ('error' in result) {
    throw new Error(result.error);
  }

  return { hash: result.hash };
}

/* ─── Legacy helpers (kept for backward compat) ─── */

export async function getTokenPrice(tokenAddress: string): Promise<number> {
  const data = await getTokenMarketData(tokenAddress);
  return data.priceUsd;
}

export async function getTokenMarketCap(tokenAddress: string): Promise<number> {
  const data = await getTokenMarketData(tokenAddress);
  return data.marketCap;
}

/* ────────────────────────────────────────────────────────── */
/*  ERC-20 token balance (server-side, read-only)             */
/* ────────────────────────────────────────────────────────── */

const ERC20_BALANCE_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

/**
 * Read an ERC-20 token balance via RPC. No wallet needed — pure read call.
 */
export async function getOnChainTokenBalance(
  tokenAddress: `0x${string}`,
  walletAddress: `0x${string}`
): Promise<bigint> {
  const client = createPublicClient({
    chain: base,
    transport: http(RPC_URL)
  });

  return client.readContract({
    address: tokenAddress,
    abi: ERC20_BALANCE_ABI,
    functionName: 'balanceOf',
    args: [walletAddress]
  });
}
