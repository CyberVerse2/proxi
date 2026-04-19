'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useSwap } from '@/hooks/use-swap';

interface WithdrawModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function WithdrawModal({ onClose, onSuccess }: WithdrawModalProps) {
  const { getUsdcBalance, sendUsdc, loading, error: swapError } = useSwap();
  const [usdcBalance, setUsdcBalance] = useState('0');
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    setBalanceLoading(true);
    try {
      const usdc = await getUsdcBalance();
      setUsdcBalance(usdc);
    } finally {
      setBalanceLoading(false);
    }
  }, [getUsdcBalance]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  const handleMax = () => {
    setAmount(usdcBalance);
  };

  const handleWithdraw = async () => {
    if (!recipient || !amount || parseFloat(amount) <= 0) return;

    setError(null);

    const hash = await sendUsdc(recipient, amount);
    if (hash) {
      setTxHash(hash);
      onSuccess();
    } else if (swapError) {
      setError(swapError);
    }
  };

  const isValidAddress = /^0x[a-fA-F0-9]{40}$/.test(recipient);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-[420px] max-w-[90vw] bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 shadow-2xl">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X size={16} />
        </button>

        <h2 className="text-white font-bold text-xl mb-1">Withdraw USDC</h2>
        <p className="text-gray text-base mb-5">
          Send BSC USDC from your Proxi wallet to an external address.
        </p>

        {txHash ? (
          /* Success state */
          <div className="flex flex-col items-center text-center py-4 space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-400/10 flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgb(52, 211, 153)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div>
              <p className="text-white font-bold text-lg">Withdrawal Sent!</p>
              <p className="text-gray text-sm mt-1">
                ${parseFloat(amount || '0').toFixed(2)} USDC sent to recipient
              </p>
            </div>

            <div className="w-full bg-white/4 rounded-xl px-4 py-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray">Amount</span>
                <span className="text-white font-medium">${parseFloat(amount || '0').toFixed(2)} USDC</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray">To</span>
                <span className="text-white font-medium font-mono text-xs">
                  {recipient.slice(0, 6)}...{recipient.slice(-4)}
                </span>
              </div>
            </div>

            <a
              href={`https://bscscan.com/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-lime text-sm hover:underline flex items-center gap-1.5"
            >
              View on BscScan
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </a>

            <Button className="w-full rounded-xl h-11 text-sm font-bold cursor-pointer" onClick={onClose}>
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Balance */}
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-gray text-base">Available</span>
                {balanceLoading ? (
                  <div className="h-5 w-24 bg-white/6 rounded animate-pulse" />
                ) : (
                  <span className="text-white font-medium text-base">
                    {parseFloat(usdcBalance).toFixed(2)} USDC
                  </span>
                )}
              </div>
            </Card>

            {/* Recipient */}
            <div className="space-y-2">
              <label className="text-gray text-sm font-medium">Recipient address</label>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="0x..."
                className="w-full bg-white/4 border border-white/10 rounded-xl px-4 py-3.5 text-base text-white placeholder:text-white/25 outline-none focus:border-white/20 transition-colors font-mono"
              />
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-gray text-sm font-medium">Amount (USDC)</label>
                <button
                  onClick={handleMax}
                  className="text-lime text-sm font-medium cursor-pointer hover:underline"
                >
                  Max
                </button>
              </div>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-white/4 border border-white/10 rounded-xl px-4 py-3.5 text-base text-white placeholder:text-white/25 outline-none focus:border-white/20 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>

            {/* Error */}
            {(error || swapError) && (
              <p className="text-red-400 text-sm bg-red-400/10 rounded-lg px-3 py-2">{error || swapError}</p>
            )}

            {/* Submit */}
            <Button
              className="w-full rounded-lg h-12 text-base font-bold cursor-pointer"
              onClick={handleWithdraw}
              disabled={
                loading ||
                !isValidAddress ||
                !amount ||
                parseFloat(amount) <= 0 ||
                parseFloat(amount) > parseFloat(usdcBalance)
              }
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={18} className="animate-spin" /> Sending...
                </span>
              ) : (
                'Withdraw'
              )}
            </Button>

            <p className="text-gray/40 text-xs text-center">
              Withdrawals are sent on BNB Smart Chain. Gas fees are sponsored.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
