'use client';

import { useState } from 'react';
import { useSendTransaction, useWallets } from '@privy-io/react-auth';
import { MESSAGE_PRICE_USD } from '@/lib/config/constants';
import { createGetUsdcBalance, createGetTokenBalance } from '@/hooks/swap/balances';
import { createExecuteSwap } from '@/hooks/swap/execution';
import { createGetPrice, createToSellAmount } from '@/hooks/swap/pricing';
import { createGetQuote } from '@/hooks/swap/quote';
import { createSendUsdc } from '@/hooks/swap/transfer';
import { getPrimaryWallet, type SwapWallet } from '@/hooks/swap/wallet';

// Re-export so existing imports from this module keep working
export { MESSAGE_PRICE_USD };

export function useSwap(messagePriceUsd?: number) {
  const msgPrice = messagePriceUsd ?? MESSAGE_PRICE_USD;
  const { wallets } = useWallets();
  const { sendTransaction } = useSendTransaction();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getWallet = () => getPrimaryWallet(wallets as unknown as SwapWallet[]);
  const toSellAmount = createToSellAmount(msgPrice);

  const getPrice = createGetPrice(setError, msgPrice);
  const getQuote = createGetQuote(setError, getWallet, toSellAmount);
  const executeSwap = createExecuteSwap(
    setLoading,
    setError,
    getWallet,
    getQuote,
    sendTransaction,
    msgPrice
  );
  const getUsdcBalance = createGetUsdcBalance(getWallet);
  const getTokenBalance = createGetTokenBalance(getWallet);
  const sendUsdc = createSendUsdc(setLoading, setError, getWallet, sendTransaction);

  return {
    getPrice,
    getQuote,
    executeSwap,
    getUsdcBalance,
    getTokenBalance,
    sendUsdc,
    loading,
    error,
    walletAddress: getWallet()?.address ?? null
  };
}
