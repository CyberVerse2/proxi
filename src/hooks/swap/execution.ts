import { encodeFunctionData, parseUnits } from 'viem';
import { USDC_ADDRESS, USDC_DECIMALS } from '@/lib/config/constants';
import { ERC20_ABI, TOKEN_DECIMALS } from './constants';
import type { SwapMode, SwapQuote } from './types';
import type { SwapWallet } from './wallet';

interface SendTxInput {
  to: string;
  data: string;
  gasLimit?: number;
  value?: bigint;
}

type SendTransaction = (
  tx: SendTxInput,
  options: { sponsor: boolean; address: string }
) => Promise<{ hash: string }>;

export function createExecuteSwap(
  setLoading: (value: boolean) => void,
  setError: (value: string | null) => void,
  getWallet: () => SwapWallet | null,
  getQuote: (tokenAddress: string, amount: string, mode: SwapMode) => Promise<SwapQuote | null>,
  sendTransaction: SendTransaction,
  messagePriceUsd: number
) {
  return async (tokenAddress: string, amount: string, mode: SwapMode): Promise<string | null> => {
    setLoading(true);
    setError(null);

    const wallet = getWallet();
    if (!wallet) {
      setError('No wallet connected');
      setLoading(false);
      return null;
    }

    try {
      const provider = await wallet.getEthereumProvider();
      const quote = await getQuote(tokenAddress, amount, mode);
      if (!quote) {
        throw new Error('Failed to get swap quote');
      }
      if (!quote.transaction) {
        console.error('[swap] Quote missing transaction data:', JSON.stringify(quote));
        throw new Error('Swap quote has no transaction — the amount may be too small or the token has no liquidity');
      }

      const sellTokenAddress = mode === 'buy' ? USDC_ADDRESS : tokenAddress;
      const sellAmountWei =
        mode === 'buy'
          ? parseUnits((parseFloat(amount) * messagePriceUsd).toFixed(USDC_DECIMALS), USDC_DECIMALS)
          : parseUnits(amount, TOKEN_DECIMALS);

      const allowanceData = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [wallet.address as `0x${string}`, quote.allowanceTarget as `0x${string}`]
      });

      const allowanceResult = await provider.request({
        method: 'eth_call',
        params: [{ to: sellTokenAddress, data: allowanceData }, 'latest']
      });

      const currentAllowance = BigInt(allowanceResult as string);
      if (currentAllowance < sellAmountWei) {
        const approveData = encodeFunctionData({
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [quote.allowanceTarget as `0x${string}`, sellAmountWei * 2n]
        });

        await sendTransaction(
          { to: sellTokenAddress, data: approveData },
          { sponsor: true, address: wallet.address }
        );
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }

      const { hash } = await sendTransaction(
        {
          to: quote.transaction.to,
          data: quote.transaction.data,
          gasLimit: Number.parseInt(quote.transaction.gas, 10),
          value: quote.transaction.value ? BigInt(quote.transaction.value) : 0n
        },
        { sponsor: true, address: wallet.address }
      );

      return hash;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Swap failed');
      return null;
    } finally {
      setLoading(false);
    }
  };
}
