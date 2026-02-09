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
  const { getUsdcBalance, sendUsdc, loading, error } = useSwap();
  const [usdcBalance, setUsdcBalance] = useState('0');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [txHash, setTxHash] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    const bal = await getUsdcBalance();
    setUsdcBalance(bal);
  }, [getUsdcBalance]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  const handleMax = () => {
    setAmount(usdcBalance);
  };

  const handleWithdraw = async () => {
    if (!recipient || !amount || parseFloat(amount) <= 0) return;
    const hash = await sendUsdc(recipient, amount);
    if (hash) {
      setTxHash(hash);
      onSuccess();
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

        <h2 className="text-white font-bold text-lg mb-1">Withdraw USDC</h2>
        <p className="text-gray text-sm mb-5">
          Send USDC from your Proxi wallet to an external address on Base.
        </p>

        {txHash ? (
          /* Success state */
          <div className="text-center py-4 space-y-3">
            <div className="text-3xl">&#10004;&#65039;</div>
            <p className="text-white font-semibold">Withdrawal sent!</p>
            <a
              href={`https://basescan.org/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-lime text-xs underline"
            >
              View on Basescan
            </a>
            <Button className="w-full rounded-lg mt-4 cursor-pointer" onClick={onClose}>
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Balance */}
            <Card className="p-3 flex items-center justify-between">
              <span className="text-gray text-sm">Available</span>
              <span className="text-white font-medium text-sm">
                {parseFloat(usdcBalance).toFixed(2)} USDC
              </span>
            </Card>

            {/* Recipient */}
            <div className="space-y-1.5">
              <label className="text-gray text-xs font-medium">Recipient address</label>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="0x..."
                className="w-full bg-white/4 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/25 outline-none focus:border-white/20 transition-colors font-mono"
              />
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-gray text-xs font-medium">Amount (USDC)</label>
                <button
                  onClick={handleMax}
                  className="text-lime text-xs font-medium cursor-pointer hover:underline"
                >
                  Max
                </button>
              </div>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-white/4 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/25 outline-none focus:border-white/20 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>

            {/* Error */}
            {error && (
              <p className="text-red-400 text-xs bg-red-400/10 rounded-lg px-3 py-2">{error}</p>
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

            <p className="text-gray/40 text-[10px] text-center">
              Withdrawals are sent on Base network. ETH gas fee applies.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
