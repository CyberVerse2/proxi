import type { BatchTokenVolume, CreatorEarningsBreakdown, TokenMarketData } from '@/lib/chain/token';

export interface DeployTokenParamsContract {
  name: string;
  symbol: string;
  proxyId: string;
  creatorAddress: string;
  imageUrl?: string;
  description?: string;
}

export interface TokenDeployResultContract {
  tokenAddress: string;
  ticker: string;
  txHash: string;
  success: boolean;
  chain: string;
}

export interface TokenDomainContract {
  deployProxyToken: (params: DeployTokenParamsContract) => Promise<TokenDeployResultContract>;
  getProxyCreatorEarnings: (
    tokenAddress: string,
    feeRecipient: `0x${string}`
  ) => Promise<CreatorEarningsBreakdown>;
  claimCreatorEarnings: (params: {
    proxyId: string;
    tokenAddress: string;
    creatorWalletAddress: `0x${string}`;
  }) => Promise<{ txHash: string; creatorAmount: bigint; grossAmount: bigint; quoteTokenAddress: string | null } | null>;
  getTokenMarketData: (tokenAddress: string) => Promise<TokenMarketData>;
  fetchBatchDexScreenerData: (tokenAddresses: string[]) => Promise<BatchTokenVolume[]>;
  getTotalLiveVolume: () => Promise<{
    totalVolume24h: number;
    totalLiquidity: number;
    totalMarketCap: number;
    tokenCount: number;
  }>;
  getTokensPerMessage: (tokenAddress: string, pricePerMessage: number) => Promise<number>;
  getRawTokensPerMessage: (tokenAddress: string, pricePerMessage: number) => Promise<bigint>;
  transferTokensFromUser: (
    userWalletAddress: string,
    tokenAddress: string,
    amount: bigint,
    recipient: string
  ) => Promise<{ hash: string }>;
  getTokenPrice: (tokenAddress: string) => Promise<number>;
  getTokenMarketCap: (tokenAddress: string) => Promise<number>;
  getOnChainTokenBalance: (
    tokenAddress: `0x${string}`,
    walletAddress: `0x${string}`
  ) => Promise<bigint>;
}
