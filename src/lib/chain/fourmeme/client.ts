import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { bsc } from 'viem/chains';
import { assertEnvPresent } from '@/lib/config/env';
import { BSC_RPC_URL } from './constants';

export const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY as `0x${string}` | undefined;
export const PROXI_FOUNDER_PRIVATE_KEY =
  (process.env.PROXI_FOUNDER_PRIVATE_KEY as `0x${string}` | undefined) ?? DEPLOYER_PRIVATE_KEY;
export const PLATFORM_WALLET = process.env.PLATFORM_WALLET_ADDRESS as `0x${string}` | undefined;
export const PROXI_FOUNDER_WALLET =
  (process.env.PROXI_FOUNDER_WALLET_ADDRESS as `0x${string}` | undefined) ?? PLATFORM_WALLET;
export const ZEROX_API_KEY = process.env.ZEROX_API_KEY ?? process.env['0X_API_KEY'] ?? '';

function normalizePrivateKey(key: `0x${string}` | string) {
  return (key.startsWith('0x') ? key : `0x${key}`) as `0x${string}`;
}

export function getBscPublicClient() {
  return createPublicClient({
    chain: bsc,
    transport: http(BSC_RPC_URL),
  });
}

export function getDeployerAccount() {
  assertEnvPresent(['DEPLOYER_PRIVATE_KEY'], 'fourmeme.deploy');
  return privateKeyToAccount(normalizePrivateKey(DEPLOYER_PRIVATE_KEY as string));
}

export function getFounderAccount() {
  assertEnvPresent(['PROXI_FOUNDER_PRIVATE_KEY'], 'fourmeme.earnings');
  return privateKeyToAccount(normalizePrivateKey(PROXI_FOUNDER_PRIVATE_KEY as string));
}

export function getDeployerWalletClient() {
  return createWalletClient({
    account: getDeployerAccount(),
    chain: bsc,
    transport: http(BSC_RPC_URL),
  });
}

export function getFounderWalletClient() {
  return createWalletClient({
    account: getFounderAccount(),
    chain: bsc,
    transport: http(BSC_RPC_URL),
  });
}
