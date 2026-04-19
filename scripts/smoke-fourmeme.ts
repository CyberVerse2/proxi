import 'dotenv/config';

import { formatEther } from 'viem';
import { bsc } from 'viem/chains';
import { assertEnvPresent } from '@/lib/config/env';
import { createFourMemeTokenPayload, extractTokenAddressFromReceipt } from '@/lib/chain/fourmeme/create';
import {
  BSC_RPC_URL,
  TAX_TOKEN_ABI,
  TOKEN_MANAGER2_ABI,
  TOKEN_MANAGER2_BSC,
  ZERO_ADDRESS,
} from '@/lib/chain/fourmeme/constants';
import {
  getBscPublicClient,
  getDeployerAccount,
  getDeployerWalletClient,
  getFounderAccount,
  PROXI_FOUNDER_WALLET,
} from '@/lib/chain/fourmeme/client';
import { USDC_ADDRESS } from '@/lib/config/constants';

type Args = {
  deploy: boolean;
  name: string;
  symbol: string;
  description: string;
  imageUrl?: string;
};

function parseArgs(): Args {
  const args = process.argv.slice(2);
  const getFlag = (name: string) => args.find((arg) => arg.startsWith(`--${name}=`))?.split('=').slice(1).join('=');

  return {
    deploy: args.includes('--deploy'),
    name: getFlag('name') ?? 'Proxi Smoke Token',
    symbol: getFlag('symbol') ?? `PS${Date.now().toString().slice(-4)}`,
    description: getFlag('description') ?? 'Live Four.meme smoke test token from Proxi.',
    imageUrl: getFlag('image-url'),
  };
}

function printHeader(title: string) {
  console.log(`\n=== ${title} ===`);
}

async function main() {
  const options = parseArgs();
  assertEnvPresent(
    ['DEPLOYER_PRIVATE_KEY', 'PROXI_FOUNDER_PRIVATE_KEY', 'PROXI_FOUNDER_WALLET_ADDRESS'],
    'smoke-fourmeme'
  );

  const publicClient = getBscPublicClient();
  const walletClient = getDeployerWalletClient();
  const deployer = getDeployerAccount();
  const founder = getFounderAccount();

  printHeader('Preflight');
  console.log(`RPC URL: ${BSC_RPC_URL}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Founder:  ${founder.address}`);
  console.log(`Founder recipient: ${PROXI_FOUNDER_WALLET}`);
  console.log(`Mode: ${options.deploy ? 'deploy' : 'dry-run'}`);

  const chainId = await publicClient.getChainId();
  console.log(`RPC chainId: ${chainId}`);
  if (chainId !== bsc.id) {
    throw new Error(`NEXT_PUBLIC_BSC_RPC_URL is not pointing at BSC. Expected ${bsc.id}, got ${chainId}.`);
  }

  const [deployerBalance, founderBalance] = await Promise.all([
    publicClient.getBalance({ address: deployer.address }),
    publicClient.getBalance({ address: founder.address }),
  ]);
  console.log(`Deployer balance: ${formatEther(deployerBalance)} BNB`);
  console.log(`Founder balance:  ${formatEther(founderBalance)} BNB`);

  printHeader('Create Payload');
  const payload = await createFourMemeTokenPayload({
    name: options.name,
    symbol: options.symbol,
    description: options.description,
    imageUrl: options.imageUrl,
  });

  console.log(`createArg bytes: ${payload.createArg.length / 2 - 1}`);
  console.log(`signature bytes: ${payload.signature.length / 2 - 1}`);
  console.log(`creation fee: ${formatEther(payload.creationFeeWei)} BNB`);

  if (!options.deploy) {
    console.log('\nDry-run complete. Re-run with --deploy to create a live token on BSC.');
    return;
  }

  printHeader('Deploy Token');
  const txHash = await walletClient.writeContract({
    address: TOKEN_MANAGER2_BSC,
    abi: TOKEN_MANAGER2_ABI,
    functionName: 'createToken',
    args: [payload.createArg, payload.signature],
    value: payload.creationFeeWei,
  });
  console.log(`txHash: ${txHash}`);

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  console.log(`receipt status: ${receipt.status}`);
  if (receipt.status !== 'success') {
    throw new Error(`Deployment transaction failed: ${txHash}`);
  }

  const tokenAddress = extractTokenAddressFromReceipt(receipt);
  console.log(`tokenAddress: ${tokenAddress}`);

  printHeader('Verify Tax Token Config');
  const [feeRate, rateFounder, rateHolder, rateBurn, rateLiquidity, founderAddress, quoteToken] =
    await Promise.all([
      publicClient.readContract({ address: tokenAddress, abi: TAX_TOKEN_ABI, functionName: 'feeRate' }),
      publicClient.readContract({ address: tokenAddress, abi: TAX_TOKEN_ABI, functionName: 'rateFounder' }),
      publicClient.readContract({ address: tokenAddress, abi: TAX_TOKEN_ABI, functionName: 'rateHolder' }),
      publicClient.readContract({ address: tokenAddress, abi: TAX_TOKEN_ABI, functionName: 'rateBurn' }),
      publicClient.readContract({ address: tokenAddress, abi: TAX_TOKEN_ABI, functionName: 'rateLiquidity' }),
      publicClient.readContract({ address: tokenAddress, abi: TAX_TOKEN_ABI, functionName: 'founder' }),
      publicClient.readContract({ address: tokenAddress, abi: TAX_TOKEN_ABI, functionName: 'quote' }),
    ]);

  console.log(`feeRate: ${feeRate.toString()}`);
  console.log(`rateFounder: ${rateFounder.toString()}`);
  console.log(`rateHolder: ${rateHolder.toString()}`);
  console.log(`rateBurn: ${rateBurn.toString()}`);
  console.log(`rateLiquidity: ${rateLiquidity.toString()}`);
  console.log(`founder: ${founderAddress}`);
  console.log(`quoteToken: ${quoteToken}`);

  if (quoteToken !== ZERO_ADDRESS && quoteToken.toLowerCase() !== USDC_ADDRESS.toLowerCase()) {
    throw new Error(`Unexpected quote token ${quoteToken}; expected BSC USDC ${USDC_ADDRESS}`);
  }
}

main().catch((error) => {
  console.error('\nSmoke test failed:');
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
