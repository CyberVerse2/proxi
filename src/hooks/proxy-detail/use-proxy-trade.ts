'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MESSAGE_PRICE_USD, MIN_BUY_MESSAGES } from '@/lib/config/constants';
import { useSwap } from '@/hooks/use-swap';
import { formatTokenAmount } from '@/lib/utils/formatting';

export function useProxyTrade({
  walletAddress,
  tokenAddress,
  chatPrice
}: {
  walletAddress: string | null;
  tokenAddress: string | null;
  chatPrice: number | null;
}) {
  const [tradeMode, setTradeMode] = useState<'buy' | 'sell'>('buy');
  const [denomination, setDenomination] = useState<'messages' | 'usd'>('messages');
  const [amount, setAmount] = useState(String(MIN_BUY_MESSAGES));
  const [swapSuccess, setSwapSuccess] = useState<{
    txHash: string;
    mode: 'buy' | 'sell';
    messages: number;
    usdcAmount: number;
  } | null>(null);

  const {
    getPrice,
    executeSwap,
    getUsdcBalance,
    getTokenBalance,
    loading: swapLoading,
    error: swapError
  } = useSwap(chatPrice ?? undefined);
  const queryClient = useQueryClient();

  const msgPrice = chatPrice ?? MESSAGE_PRICE_USD;
  const rawAmount = parseFloat(amount) || 0;
  const msgCount = denomination === 'messages' ? rawAmount : rawAmount / msgPrice;
  const usdcCost = denomination === 'messages' ? rawAmount * msgPrice : rawAmount;

  const { data: balances, isLoading: balancesLoading } = useQuery({
    queryKey: ['balances', walletAddress, tokenAddress],
    queryFn: async () => {
      const [usdc, tok] = await Promise.all([
        getUsdcBalance(),
        tokenAddress ? getTokenBalance(tokenAddress) : Promise.resolve('0')
      ]);
      return { usdcBalance: usdc, tokenBalance: tok };
    },
    enabled: !!walletAddress,
    refetchInterval: 30_000,
    placeholderData: { usdcBalance: '0', tokenBalance: '0' }
  });

  const { data: pricingData, isLoading: pricingLoading } = useQuery({
    queryKey: ['tokensPerMessage', tokenAddress],
    queryFn: async () => {
      const result = await getPrice(tokenAddress!, '1', 'buy');
      if (!result) return { raw: 0, formatted: null };
      const tokens = Number(result.buyAmount) / 1e18;
      return { raw: tokens, formatted: tokens > 0 ? formatTokenAmount(tokens) : null };
    },
    enabled: !!tokenAddress,
    staleTime: 60_000,
    placeholderData: { raw: 0, formatted: null }
  });

  const usdcBalance = balances?.usdcBalance ?? '0';
  const tokenBalance = balances?.tokenBalance ?? '0';
  const rawTokensPerMessage = pricingData?.raw ?? 0;
  const tokensPerMessage = pricingData?.formatted ?? null;
  const messagesOwned =
    rawTokensPerMessage > 0 ? Math.floor(parseFloat(tokenBalance) / rawTokensPerMessage) : 0;

  const handleSwap = async () => {
    if (!tokenAddress || !amount || msgCount <= 0) return;
    if (tradeMode === 'buy' && msgCount < MIN_BUY_MESSAGES) return;

    setSwapSuccess(null);
    const savedMode = tradeMode;
    const savedMsgCount = Math.round(msgCount);
    const savedUsdcCost = usdcCost;
    const swapAmount =
      tradeMode === 'sell' ? String(savedMsgCount * rawTokensPerMessage) : String(savedMsgCount);

    const txHash = await executeSwap(tokenAddress, swapAmount, tradeMode);
    if (!txHash) return;

    setSwapSuccess({
      txHash,
      mode: savedMode,
      messages: savedMsgCount,
      usdcAmount: savedUsdcCost
    });
    setAmount(
      denomination === 'messages'
        ? String(MIN_BUY_MESSAGES)
        : (MIN_BUY_MESSAGES * msgPrice).toFixed(2)
    );

    await new Promise((resolve) => setTimeout(resolve, 2000));
    await queryClient.invalidateQueries({ queryKey: ['balances', walletAddress, tokenAddress] });
    await queryClient.invalidateQueries({ queryKey: ['tokensPerMessage', tokenAddress] });
  };

  return {
    tradeMode,
    setTradeMode,
    denomination,
    setDenomination,
    amount,
    setAmount,
    swapSuccess,
    setSwapSuccess,
    swapLoading,
    swapError,
    msgPrice,
    rawAmount,
    msgCount,
    usdcCost,
    balancesLoading,
    pricingLoading,
    usdcBalance,
    tokenBalance,
    rawTokensPerMessage,
    tokensPerMessage,
    messagesOwned,
    handleSwap
  };
}
