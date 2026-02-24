import { db } from '@/lib/db';
import { proxies, proxyTokens } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getClankerClient, PLATFORM_WALLET } from './internal';

export interface DeployTokenParams {
  name: string;
  symbol: string;
  proxyId: string;
  /** Creator's wallet – set as reward recipient (earns LP fees) */
  creatorAddress: string;
  imageUrl?: string;
  description?: string;
}

export interface TokenDeployResult {
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
