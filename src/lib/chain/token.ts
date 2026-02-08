/**
 * Token deployment via Clanker API on Base chain.
 * https://clanker.gitbook.io/clanker-documentation/authenticated/deploy-token-v4.0.0
 */

import { db } from "@/lib/db";
import { proxyTokens, proxies } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const CLANKER_API = "https://www.clanker.world/api/tokens/deploy/v4";
const CLANKER_API_KEY = process.env.CLANKER_API_KEY;
const WETH_BASE = "0x4200000000000000000000000000000000000006";

interface DeployTokenParams {
  name: string;
  symbol: string;
  proxyId: string;
  creatorAddress: string;
  imageUrl?: string;
  description?: string;
}

interface TokenDeployResult {
  tokenAddress: string;
  success: boolean;
  chain: string;
}

/**
 * Deploy a proxy token on Base via Clanker v4.0.0 API.
 */
export async function deployProxyToken(params: DeployTokenParams): Promise<TokenDeployResult> {
  const { name, symbol, proxyId, creatorAddress, imageUrl, description } = params;

  if (!CLANKER_API_KEY) {
    throw new Error("CLANKER_API_KEY not configured. Add it to your .env file.");
  }

  // Generate a unique 32-character request key
  const requestKey = crypto.randomUUID().replace(/-/g, "");

  const body = {
    token: {
      name,
      symbol,
      image: imageUrl ?? undefined,
      tokenAdmin: creatorAddress as `0x${string}`,
      description: description ?? `AI proxy token for ${name} on Proxi`,
      requestKey,
    },
    rewards: [
      {
        admin: creatorAddress as `0x${string}`,
        recipient: creatorAddress as `0x${string}`,
        allocation: 100,
        rewardsToken: "Both",
      },
    ],
    pool: {
      type: "standard",
      pairedToken: WETH_BASE,
    },
    fees: {
      type: "static",
      clankerFee: 1,
      pairedFee: 1,
    },
    chainId: 8453, // Base
  };

  const response = await fetch(CLANKER_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": CLANKER_API_KEY,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(`Clanker deployment failed: ${err.error ?? response.statusText}`);
  }

  const data = await response.json();
  const tokenAddress = data.expectedAddress;

  // Store in DB
  await db.insert(proxyTokens).values({
    proxyId,
    tokenAddress,
    chain: "base",
    metadata: { requestKey, clankerResponse: data },
  });

  // Update proxy record
  await db.update(proxies)
    .set({ tokenAddress, updatedAt: new Date() })
    .where(eq(proxies.id, proxyId));

  return {
    tokenAddress,
    success: true,
    chain: "base",
  };
}

/**
 * Get token price from DexScreener API.
 */
export async function getTokenPrice(tokenAddress: string): Promise<number> {
  try {
    const res = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`,
      { next: { revalidate: 60 } } // Cache for 60 seconds
    );
    if (!res.ok) return 0;
    const data = await res.json();
    const pair = data.pairs?.[0];
    return pair ? parseFloat(pair.priceUsd ?? "0") : 0;
  } catch {
    return 0;
  }
}

/**
 * Get token market cap from DexScreener API.
 */
export async function getTokenMarketCap(tokenAddress: string): Promise<number> {
  try {
    const res = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) return 0;
    const data = await res.json();
    const pair = data.pairs?.[0];
    return pair ? parseFloat(pair.marketCap ?? "0") : 0;
  } catch {
    return 0;
  }
}
