import { getWalletIdByAddress, sendTransactionViaPrivy } from '@/lib/auth/privy';
import { createPublicClient, encodeFunctionData, http, parseAbi } from 'viem';
import { base } from 'viem/chains';
import { RPC_URL } from './internal';

const ERC20_TRANSFER_ABI = parseAbi([
  'function transfer(address to, uint256 amount) returns (bool)'
]);

/**
 * Transfer ERC-20 tokens from a user's Privy embedded wallet to a recipient.
 * Uses Privy's server-side wallet RPC — no client interaction required.
 *
 * @param userWalletAddress  The user's on-chain wallet address
 * @param tokenAddress       The ERC-20 token contract address
 * @param amount             Raw token amount (18 decimals)
 * @param recipient          Destination wallet address
 * @returns                  The transaction hash
 */
export async function transferTokensFromUser(
  userWalletAddress: string,
  tokenAddress: string,
  amount: bigint,
  recipient: string
): Promise<{ hash: string }> {
  // 1. Look up the Privy wallet ID
  const walletId = await getWalletIdByAddress(userWalletAddress);
  if (!walletId) {
    throw new Error(`Could not find Privy wallet for address ${userWalletAddress}`);
  }

  // 2. Encode the ERC-20 transfer call
  const transferData = encodeFunctionData({
    abi: ERC20_TRANSFER_ABI,
    functionName: 'transfer',
    args: [recipient as `0x${string}`, amount]
  });

  // 3. Send via Privy server-side RPC
  const result = await sendTransactionViaPrivy(walletId, tokenAddress, transferData);

  if ('error' in result) {
    throw new Error(result.error);
  }

  return { hash: result.hash };
}

const ERC20_BALANCE_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

/**
 * Read an ERC-20 token balance via RPC. No wallet needed — pure read call.
 */
export async function getOnChainTokenBalance(
  tokenAddress: `0x${string}`,
  walletAddress: `0x${string}`
): Promise<bigint> {
  const client = createPublicClient({
    chain: base,
    transport: http(RPC_URL)
  });

  return client.readContract({
    address: tokenAddress,
    abi: ERC20_BALANCE_ABI,
    functionName: 'balanceOf',
    args: [walletAddress]
  });
}
