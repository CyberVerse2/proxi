import { db } from '@/lib/db';
import { proxies, proxyTokens } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getBscPublicClient, getDeployerAccount, getDeployerWalletClient } from './client';
import { createFourMemeTokenPayload, extractTokenAddressFromReceipt } from './create';
import { TOKEN_MANAGER2_ABI, TOKEN_MANAGER2_BSC } from './constants';

export interface DeployFourMemeTokenParams {
  name: string;
  symbol: string;
  proxyId: string;
  creatorAddress: string;
  imageUrl?: string;
  description?: string;
}

export async function deployFourMemeToken(params: DeployFourMemeTokenParams) {
  const payload = await createFourMemeTokenPayload({
    name: params.name,
    symbol: params.symbol,
    description: params.description ?? `Digital clone of ${params.name}. Chat with me on Proxi.`,
    imageUrl: params.imageUrl,
  });

  const walletClient = getDeployerWalletClient();
  const publicClient = getBscPublicClient();
  const deployerAddress = getDeployerAccount().address;

  const txHash = await walletClient.writeContract({
    address: TOKEN_MANAGER2_BSC,
    abi: TOKEN_MANAGER2_ABI,
    functionName: 'createToken',
    args: [payload.createArg, payload.signature],
    value: payload.creationFeeWei,
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  if (receipt.status !== 'success') {
    throw new Error(`Four.meme deployment transaction failed: ${txHash}`);
  }

  const tokenAddress = extractTokenAddressFromReceipt(receipt);

  await db.insert(proxyTokens).values({
    proxyId: params.proxyId,
    tokenAddress,
    chain: 'bsc',
    metadata: {
      txHash,
      deployerAddress,
      creatorAddress: params.creatorAddress,
      platformFounderWallet: process.env.PROXI_FOUNDER_WALLET_ADDRESS ?? process.env.PLATFORM_WALLET_ADDRESS ?? null,
      provider: 'four.meme',
      taxToken: true,
      quoteAsset: 'USDC',
    },
  });

  await db
    .update(proxies)
    .set({ tokenAddress, ticker: params.symbol, updatedAt: new Date() })
    .where(eq(proxies.id, params.proxyId));

  return {
    tokenAddress,
    ticker: params.symbol,
    txHash,
    success: true,
    chain: 'bsc',
  };
}
