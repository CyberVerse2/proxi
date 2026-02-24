import type { SwapMode, SwapQuote } from './types';
import type { SwapWallet } from './wallet';

export function createGetQuote(
  setError: (value: string | null) => void,
  getWallet: () => SwapWallet | null,
  toSellAmount: (amount: string, mode: SwapMode) => string
) {
  return async (
    tokenAddress: string,
    amount: string,
    mode: SwapMode
  ): Promise<SwapQuote | null> => {
    setError(null);
    const wallet = getWallet();
    if (!wallet) {
      setError('No wallet connected');
      return null;
    }

    try {
      const sellAmount = toSellAmount(amount, mode);
      const params = new URLSearchParams({
        type: 'quote',
        mode,
        tokenAddress,
        sellAmount,
        taker: wallet.address
      });

      const res = await fetch(`/api/swap?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to get quote');
      }

      return await res.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get quote');
      return null;
    }
  };
}
