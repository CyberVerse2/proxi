/**
 * Token deployment via Clanker SDK (v4) on Base chain.
 * Uses a server-side deployer wallet to sign transactions directly on-chain.
 * https://clanker.gitbook.io/clanker-documentation/sdk/v4.0.0
 */

import { Clanker } from "clanker-sdk/v4";
import {
  createWalletClient,
  createPublicClient,
  http,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { db } from "@/lib/db";
import { proxyTokens, proxies } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/* ────────────────────────────────────────────────────────── */
/*  Deployer wallet setup                                     */
/* ────────────────────────────────────────────────────────── */

const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY as
  | `0x${string}`
  | undefined;

const RPC_URL =
  process.env.NEXT_PUBLIC_BASE_RPC_URL ?? "https://mainnet.base.org";

function getClankerClient() {
  if (!DEPLOYER_PRIVATE_KEY) {
    throw new Error(
      "DEPLOYER_PRIVATE_KEY not configured. Add it to your .env file."
    );
  }

  const account = privateKeyToAccount(DEPLOYER_PRIVATE_KEY);
  const publicClient = createPublicClient({
    chain: base,
    transport: http(RPC_URL),
  });
  const wallet = createWalletClient({
    account,
    chain: base,
    transport: http(RPC_URL),
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- viem minor version mismatch with SDK
  return { clanker: new Clanker({ publicClient: publicClient as any, wallet: wallet as any }), account };
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
export async function deployProxyToken(
  params: DeployTokenParams
): Promise<TokenDeployResult> {
  const { name, symbol, proxyId, creatorAddress, imageUrl, description } =
    params;

  const { clanker, account } = getClankerClient();
  const deployerAddress = account.address;

  const { txHash, waitForTransaction, error } = await clanker.deploy({
    name,
    symbol,
    image: imageUrl ?? "",
    tokenAdmin: deployerAddress,
    metadata: {
      description: description ?? `AI proxy token for ${name} on Proxi`,
    },
    context: {
      interface: "Proxi",
    },
    rewards: {
      recipients: [
        {
          admin: deployerAddress,
          recipient: creatorAddress as `0x${string}`,
          bps: 10_000, // 100% of rewards to creator
          token: "Both",
        },
      ],
    },
    fees: {
      type: "static",
      clankerFee: 100, // 1% in bps
      pairedFee: 100, // 1% in bps
    },
  });

  if (error) {
    throw new Error(`Clanker deployment failed: ${error.message}`);
  }

  if (!txHash || !waitForTransaction) {
    throw new Error("Clanker deployment failed: no transaction returned");
  }

  // Wait for on-chain confirmation
  const txResult = await waitForTransaction();
  if (txResult.error) {
    throw new Error(
      `Clanker tx confirmation failed: ${txResult.error.message}`
    );
  }

  const tokenAddress = txResult.address;

  // Store in DB
  await db.insert(proxyTokens).values({
    proxyId,
    tokenAddress,
    chain: "base",
    metadata: { txHash, deployerAddress },
  });

  // Update proxy record
  await db
    .update(proxies)
    .set({ tokenAddress, updatedAt: new Date() })
    .where(eq(proxies.id, proxyId));

  return {
    tokenAddress,
    txHash,
    success: true,
    chain: "base",
  };
}

/* ────────────────────────────────────────────────────────── */
/*  Price helpers (DexScreener)                               */
/* ────────────────────────────────────────────────────────── */

/**
 * Get token price from DexScreener API.
 */
export async function getTokenPrice(tokenAddress: string): Promise<number> {
  try {
    const res = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`,
      { next: { revalidate: 60 } }
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
