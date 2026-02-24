import { Clanker } from 'clanker-sdk/v4';
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import { assertEnvPresent } from '@/lib/config/env';

export const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY as `0x${string}` | undefined;
export const PLATFORM_WALLET = process.env.PLATFORM_WALLET_ADDRESS as `0x${string}`;
export const RPC_URL = process.env.NEXT_PUBLIC_BASE_RPC_URL ?? 'https://mainnet.base.org';
export const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY ?? '';
export const ZX_API_KEY = process.env['0X_API_KEY'] ?? '';

/** ClankerFeeLocker on Base mainnet (v4) */
export const FEE_LOCKER_ADDRESS = '0xF3622742b1E446D92e45E22923Ef11C2fcD55D68' as const;

/** Wrapped ETH on Base */
export const WETH_ADDRESS = '0x4200000000000000000000000000000000000006' as const;

export const FEE_LOCKER_ABI = [
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

export function getClankerClient() {
  assertEnvPresent(['DEPLOYER_PRIVATE_KEY'], 'token.deploy');

  const account = privateKeyToAccount(DEPLOYER_PRIVATE_KEY as `0x${string}`);
  const publicClient = createPublicClient({
    chain: base,
    transport: http(RPC_URL)
  });
  const wallet = createWalletClient({
    account,
    chain: base,
    transport: http(RPC_URL)
  });

  return {
    // viem minor version mismatch with SDK requires explicit bridge cast
    clanker: new Clanker({
      publicClient: publicClient as unknown as never,
      wallet: wallet as unknown as never
    }),
    account
  };
}
