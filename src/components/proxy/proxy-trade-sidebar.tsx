'use client';

import { ArrowLeftRight, DollarSign, ExternalLink, Info, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { SLIPPAGE_BPS, SWAP_FEE_BPS, MIN_BUY_MESSAGES } from '@/lib/config/constants';
import { formatUsd } from '@/lib/utils/formatting';

export function ProxyTradeSidebar({
  swapSuccess,
  onClearSwapSuccess,
  tradeMode,
  setTradeMode,
  denomination,
  setDenomination,
  amount,
  setAmount,
  msgPrice,
  pricingLoading,
  tokensPerMessage,
  tokenPrice,
  tokenChange,
  rawAmount,
  usdcCost,
  msgCount,
  balancesLoading,
  usdcBalance,
  hasTokenAddress,
  rawTokensPerMessage,
  tokenBalance,
  swapError,
  authenticated,
  onLogin,
  swapLoading,
  onSwap,
  marketValue,
  onViewAllReviews
}: {
  swapSuccess: { txHash: string; mode: 'buy' | 'sell'; messages: number; usdcAmount: number } | null;
  onClearSwapSuccess: () => void;
  tradeMode: 'buy' | 'sell';
  setTradeMode: (mode: 'buy' | 'sell') => void;
  denomination: 'messages' | 'usd';
  setDenomination: (denomination: 'messages' | 'usd') => void;
  amount: string;
  setAmount: (amount: string) => void;
  msgPrice: number;
  pricingLoading: boolean;
  tokensPerMessage: string | null;
  tokenPrice: number;
  tokenChange: number;
  rawAmount: number;
  usdcCost: number;
  msgCount: number;
  balancesLoading: boolean;
  usdcBalance: string;
  hasTokenAddress: boolean;
  rawTokensPerMessage: number;
  tokenBalance: string;
  swapError: string | null;
  authenticated: boolean;
  onLogin: () => void;
  swapLoading: boolean;
  onSwap: () => void;
  marketValue: number;
  onViewAllReviews: () => void;
}) {
  return (
    <div className="hidden lg:flex flex-col gap-4 w-[340px] shrink-0">
      <Card className="space-y-4 p-5">
        {swapSuccess ? (
          <div className="flex flex-col items-center text-center py-2 space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-400/10 flex items-center justify-center">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgb(52, 211, 153)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div>
              <p className="text-white font-bold text-lg">
                {swapSuccess.mode === 'buy' ? 'Purchase Complete!' : 'Sell Complete!'}
              </p>
              <p className="text-gray text-sm mt-1">
                {swapSuccess.mode === 'buy'
                  ? `You bought ${swapSuccess.messages} message${swapSuccess.messages !== 1 ? 's' : ''}`
                  : `You sold ${swapSuccess.messages} message${swapSuccess.messages !== 1 ? 's' : ''}`}
              </p>
            </div>

            <div className="w-full bg-white/4 rounded-xl px-4 py-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray">Messages</span>
                <span className="text-white font-medium">{swapSuccess.messages}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray">{swapSuccess.mode === 'buy' ? 'Cost' : 'Received'}</span>
                <span className="text-white font-medium">
                  {swapSuccess.mode === 'buy' ? '' : '~'}${swapSuccess.usdcAmount.toFixed(2)} USDC
                </span>
              </div>
            </div>

            <a
              href={`https://basescan.org/tx/${swapSuccess.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-lime text-sm hover:underline flex items-center gap-1.5"
            >
              View on Basescan <ExternalLink size={13} />
            </a>

            <Button className="w-full rounded-xl h-11 text-sm font-bold cursor-pointer" onClick={onClearSwapSuccess}>
              {swapSuccess.mode === 'buy' ? 'Buy More' : 'Done'}
            </Button>
          </div>
        ) : (
          <>
            <div className="flex bg-white/6 rounded-xl p-1">
              <button
                onClick={() => {
                  setTradeMode('buy');
                  setAmount(
                    denomination === 'messages' ? String(MIN_BUY_MESSAGES) : (MIN_BUY_MESSAGES * msgPrice).toFixed(2)
                  );
                }}
                className={cn(
                  'flex-1 py-2 text-sm font-semibold rounded-[10px] transition-colors cursor-pointer',
                  tradeMode === 'buy' ? 'bg-white/12 text-white' : 'text-gray hover:text-white'
                )}
              >
                Buy
              </button>
              <button
                onClick={() => {
                  setTradeMode('sell');
                  setAmount(
                    denomination === 'messages' ? String(MIN_BUY_MESSAGES) : (MIN_BUY_MESSAGES * msgPrice).toFixed(2)
                  );
                }}
                className={cn(
                  'flex-1 py-2 text-sm font-semibold rounded-[10px] transition-colors cursor-pointer',
                  tradeMode === 'sell' ? 'bg-white/12 text-white' : 'text-gray hover:text-white'
                )}
              >
                Sell
              </button>
            </div>

            <div className="bg-white/4 rounded-xl px-4 py-3 space-y-1">
              {pricingLoading ? (
                <div className="h-5 w-48 bg-white/6 rounded animate-pulse" />
              ) : tokensPerMessage ? (
                <p className="text-white text-sm font-medium">
                  {tokensPerMessage} tokens <span className="text-gray">(${msgPrice.toFixed(2)})</span> = 1
                  message
                </p>
              ) : null}
              <div className="flex items-baseline gap-2.5">
                <span className="text-white text-2xl font-bold leading-tight">{formatUsd(tokenPrice)}</span>
                <span
                  className={cn(
                    'text-xs font-medium',
                    tokenChange >= 0 ? 'text-emerald-400' : 'text-red-400'
                  )}
                >
                  {tokenChange >= 0 ? '+' : ''}
                  {tokenChange.toFixed(2)}%
                </span>
              </div>
              <p className="text-gray text-[11px]">per token</p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-gray text-xs font-medium">
                  {denomination === 'messages'
                    ? tradeMode === 'buy'
                      ? 'Messages to buy'
                      : 'Messages to sell'
                    : tradeMode === 'buy'
                      ? 'Amount to spend'
                      : 'Amount to receive'}
                </label>
                <button
                  onClick={() => {
                    if (denomination === 'messages') {
                      const usd = rawAmount * msgPrice;
                      setAmount(usd > 0 ? usd.toFixed(2) : '1');
                      setDenomination('usd');
                    } else {
                      const messages = Math.round(rawAmount / msgPrice);
                      setAmount(messages > 0 ? String(messages) : String(MIN_BUY_MESSAGES));
                      setDenomination('messages');
                    }
                  }}
                  className="flex items-center gap-1 text-[11px] text-lime/80 hover:text-lime transition-colors cursor-pointer"
                >
                  <ArrowLeftRight size={11} />
                  {denomination === 'messages' ? 'Switch to USD' : 'Switch to Messages'}
                </button>
              </div>
              <div className="flex items-center gap-2 bg-white/4 border border-white/10 rounded-xl px-4 py-3">
                {denomination === 'usd' && <DollarSign size={14} className="text-gray shrink-0" />}
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="flex-1 min-w-0 bg-transparent text-white text-sm font-medium outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder="0"
                  min={denomination === 'messages' ? '1' : '0.10'}
                  step={denomination === 'messages' ? '1' : '0.10'}
                />
                <span className="text-gray text-xs shrink-0">{denomination === 'messages' ? 'msgs' : 'USD'}</span>
              </div>

              {rawAmount > 0 && (
                <p className="text-gray text-xs">
                  {denomination === 'messages' ? (
                    tradeMode === 'buy' ? (
                      <>
                        Cost: <span className="text-white font-medium">${usdcCost.toFixed(2)} USDC</span>
                      </>
                    ) : (
                      <>
                        You receive: <span className="text-white font-medium">~${usdcCost.toFixed(2)} USDC</span>
                      </>
                    )
                  ) : (
                    <>
                      = <span className="text-white font-medium">{Math.round(msgCount)} messages</span>
                      {tradeMode === 'sell' ? ' to sell' : ''}
                    </>
                  )}
                </p>
              )}
            </div>

            <div className="flex gap-2">
              {denomination === 'messages'
                ? ['10', '50', '100'].map((label) => (
                    <button
                      key={label}
                      onClick={() => setAmount(label)}
                      className={cn(
                        'flex-1 py-2 text-xs font-medium border rounded-xl transition-colors cursor-pointer',
                        amount === label
                          ? 'border-lime/40 text-lime bg-lime/5'
                          : 'border-white/10 text-gray hover:text-white hover:border-white/20'
                      )}
                    >
                      {label} msgs
                    </button>
                  ))
                : ['1', '5', '10'].map((label) => (
                    <button
                      key={label}
                      onClick={() => setAmount(label)}
                      className={cn(
                        'flex-1 py-2 text-xs font-medium border rounded-xl transition-colors cursor-pointer',
                        amount === label
                          ? 'border-lime/40 text-lime bg-lime/5'
                          : 'border-white/10 text-gray hover:text-white hover:border-white/20'
                      )}
                    >
                      ${label}
                    </button>
                  ))}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray">USDC Balance</span>
                {balancesLoading ? (
                  <div className="h-3.5 w-16 bg-white/6 rounded animate-pulse" />
                ) : (
                  <span className="text-white font-medium">${parseFloat(usdcBalance).toFixed(2)}</span>
                )}
              </div>
              {hasTokenAddress && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray">Messages owned</span>
                  {balancesLoading || pricingLoading ? (
                    <div className="h-3.5 w-20 bg-white/6 rounded animate-pulse" />
                  ) : (
                    <span className="text-white font-medium">
                      {rawTokensPerMessage > 0
                        ? Math.floor(parseFloat(tokenBalance) / rawTokensPerMessage).toLocaleString()
                        : '0'} msgs
                    </span>
                  )}
                </div>
              )}
            </div>

            {swapError && (
              <p className="text-red-400 text-xs bg-red-400/10 rounded-xl px-3 py-2">{swapError}</p>
            )}

            {!authenticated ? (
              <Button className="w-full rounded-xl h-11 text-sm font-bold cursor-pointer" onClick={onLogin}>
                Connect Wallet
              </Button>
            ) : !hasTokenAddress ? (
              <Button className="w-full rounded-xl h-11 text-sm font-bold" disabled>
                Token not deployed
              </Button>
            ) : (
              <>
                {tradeMode === 'buy' && msgCount > 0 && msgCount < MIN_BUY_MESSAGES && (
                  <p className="text-yellow-400 text-xs text-center mb-1">
                    Minimum purchase is {MIN_BUY_MESSAGES} messages
                  </p>
                )}
                <Button
                  className="w-full rounded-xl h-11 text-sm font-bold cursor-pointer"
                  onClick={onSwap}
                  disabled={
                    swapLoading || !amount || msgCount <= 0 || (tradeMode === 'buy' && msgCount < MIN_BUY_MESSAGES)
                  }
                >
                  {swapLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin" /> Processing...
                    </span>
                  ) : tradeMode === 'buy' ? (
                    `Buy ${Math.round(msgCount)} Messages — $${usdcCost.toFixed(2)}`
                  ) : (
                    `Sell ${Math.round(msgCount)} Messages`
                  )}
                </Button>
              </>
            )}

            <p className="text-gray/40 text-[11px] text-center flex items-center justify-center gap-1.5">
              <Info size={10} /> ${msgPrice.toFixed(2)}/msg &middot; {parseInt(SWAP_FEE_BPS) / 100}% fee &middot;{' '}
              {parseInt(SLIPPAGE_BPS) / 100}% slippage
            </p>
          </>
        )}
      </Card>

      <Card className="space-y-3">
        <h3 className="text-white font-semibold text-base">Your position</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-gray text-sm">Messages owned</span>
            {balancesLoading || pricingLoading ? (
              <div className="h-4 w-16 bg-white/6 rounded animate-pulse" />
            ) : (
              <span className="text-white text-base font-medium">
                {rawTokensPerMessage > 0
                  ? Math.floor(parseFloat(tokenBalance) / rawTokensPerMessage).toLocaleString()
                  : '0'}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray text-sm">Market value</span>
            {balancesLoading ? (
              <div className="h-4 w-14 bg-white/6 rounded animate-pulse" />
            ) : (
              <span className="text-white text-base font-medium">${marketValue.toFixed(2)}</span>
            )}
          </div>
        </div>
      </Card>

      <Button variant="outline" size="sm" className="w-full cursor-pointer" onClick={onViewAllReviews}>
        View reviews
      </Button>
    </div>
  );
}
