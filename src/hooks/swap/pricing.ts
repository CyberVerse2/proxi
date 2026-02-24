import { parseUnits } from 'viem';
import { USDC_DECIMALS } from '@/lib/config/constants';
import type { SwapMode } from './types';
import { TOKEN_DECIMALS } from './constants';

function toSellAmount(amount: string, mode: SwapMode, messagePriceUsd: number): string {
  if (mode === 'buy') {
    const usdcCost = parseFloat(amount) * messagePriceUsd;
    return parseUnits(usdcCost.toFixed(USDC_DECIMALS), USDC_DECIMALS).toString();
  }
  return parseUnits(amount, TOKEN_DECIMALS).toString();
}

export function createGetPrice(setError: (value: string | null) => void, messagePriceUsd: number) {
  return async (
    tokenAddress: string,
    amount: string,
    mode: SwapMode
  ): Promise<{ buyAmount: string; sellAmount: string } | null> => {
    setError(null);
    try {
      const sellAmount = toSellAmount(amount, mode, messagePriceUsd);
      const params = new URLSearchParams({
        type: 'price',
        mode,
        tokenAddress,
        sellAmount
      });

      const res = await fetch(`/api/swap?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? 'Failed to get price');
      }

      return await res.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get price');
      return null;
    }
  };
}

export function createToSellAmount(messagePriceUsd: number) {
  return (amount: string, mode: SwapMode) => toSellAmount(amount, mode, messagePriceUsd);
}
