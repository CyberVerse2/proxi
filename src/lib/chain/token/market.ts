import { db } from '@/lib/db';
import { proxyTokens } from '@/lib/db/schema';

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
 * Uses DexScreener for price, liquidity, and pair data.
 */
export async function getTokenMarketData(tokenAddress: string): Promise<TokenMarketData> {
  const [dexData, priceHistory] = await Promise.all([
    fetchDexScreenerData(tokenAddress).catch(() => null),
    fetchDexScreenerPriceHistory(tokenAddress).catch(() => [])
  ]);
  const priceUsd = dexData?.priceUsd ? parseFloat(dexData.priceUsd) : 0;

  return {
    name: dexData?.name ?? null,
    symbol: dexData?.symbol ?? null,
    decimals: dexData?.decimals ?? null,
    logo: dexData?.imageUrl ?? null,
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
    decimals: pair.baseToken?.address ? 18 : undefined,
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

async function fetchDexScreenerPriceHistory(
  tokenAddress: string
): Promise<{ timestamp: number; price: number }[]> {
  const data = await fetchDexScreenerData(tokenAddress);
  if (!data?.priceUsd) return [];

  return [
    {
      timestamp: Date.now(),
      price: parseFloat(data.priceUsd),
    },
  ];
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
 * Uses the /tokens/v1/bsc/{addresses} endpoint (up to 30 per request).
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
        `https://api.dexscreener.com/tokens/v1/bsc/${joined}`,
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
          priceUsd: pair.priceUsd ? parseFloat(pair.priceUsd) : 0
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
    tokenCount: data.length
  };
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
