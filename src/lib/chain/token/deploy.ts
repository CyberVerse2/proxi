import { deployFourMemeToken } from '@/lib/chain/fourmeme/deploy';

export interface DeployTokenParams {
  name: string;
  symbol: string;
  proxyId: string;
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

export async function deployProxyToken(params: DeployTokenParams): Promise<TokenDeployResult> {
  return deployFourMemeToken(params);
}
