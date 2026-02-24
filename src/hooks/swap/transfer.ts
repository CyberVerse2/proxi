import { encodeFunctionData, parseUnits } from 'viem';
import { USDC_ADDRESS, USDC_DECIMALS } from '@/lib/config/constants';
import { ERC20_ABI } from './constants';
import type { SwapWallet } from './wallet';

interface SendTxInput {
  to: string;
  data: string;
}

type SendTransaction = (
  tx: SendTxInput,
  options: { sponsor: boolean; address: string }
) => Promise<{ hash: string }>;

export function createSendUsdc(
  setLoading: (value: boolean) => void,
  setError: (value: string | null) => void,
  getWallet: () => SwapWallet | null,
  sendTransaction: SendTransaction
) {
  return async (recipient: string, amount: string): Promise<string | null> => {
    setLoading(true);
    setError(null);

    const wallet = getWallet();
    if (!wallet) {
      setError('No wallet connected');
      setLoading(false);
      return null;
    }

    try {
      const amountWei = parseUnits(parseFloat(amount).toFixed(USDC_DECIMALS), USDC_DECIMALS);
      const data = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [recipient as `0x${string}`, amountWei]
      });

      const { hash } = await sendTransaction(
        { to: USDC_ADDRESS, data },
        { sponsor: true, address: wallet.address }
      );

      return hash;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transfer failed');
      return null;
    } finally {
      setLoading(false);
    }
  };
}
