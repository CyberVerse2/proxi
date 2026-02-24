'use client';

import Link from 'next/link';
import { Brain, CheckCircle, Coins, ExternalLink, Gem, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatFeeUsd } from '@/lib/utils/formatting';

interface FeeData {
  claimed: string;
  unclaimed: string;
  total: string;
  totalUsd: number;
}

export function ProxyAboutTab({
  proxy,
  avatar,
  name,
  handle,
  feeData,
  authenticated,
  authXHandle,
  claimResult,
  claimLoading,
  onClaimFees
}: {
  proxy: { xHandle: string; tokenAddress: string | null; coreBrain: unknown };
  avatar: string;
  name: string;
  handle: string;
  feeData?: FeeData | null;
  authenticated: boolean;
  authXHandle: string | null;
  claimResult: { success: boolean; txHash?: string; amount?: string; message?: string } | null;
  claimLoading: boolean;
  onClaimFees: () => void;
}) {
  return (
    <div className="space-y-6">
      {proxy.tokenAddress && (
        <Card className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <img
                src={avatar}
                alt={name}
                width={48}
                height={48}
                className="rounded-xl object-cover shrink-0"
              />
              <div className="min-w-0 space-y-1">
                <Badge className="bg-purple/15 text-purple border-purple/20">
                  <Gem size={14} className="fill-purple" /> Fee earnings
                </Badge>
                <p className="text-white text-xl font-bold">
                  {feeData && feeData.totalUsd > 0 ? formatFeeUsd(feeData.totalUsd) : '$0.00'}
                </p>
              </div>
            </div>
          </div>

          {authenticated && authXHandle?.toLowerCase() === proxy.xHandle.toLowerCase() && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/4 rounded-xl px-4 py-3">
                  <p className="text-gray text-xs font-medium mb-0.5">Claimed</p>
                  <p className="text-white/70 text-base font-semibold">
                    {feeData ? `${parseFloat(feeData.claimed).toFixed(6)}` : '0.000000'}
                    <span className="text-gray text-xs ml-1">WETH</span>
                  </p>
                </div>
                <div className="bg-emerald-400/5 border border-emerald-400/10 rounded-xl px-4 py-3">
                  <p className="text-gray text-xs font-medium mb-0.5">Unclaimed</p>
                  <p className="text-emerald-400 text-base font-semibold">
                    {feeData ? `${parseFloat(feeData.unclaimed).toFixed(6)}` : '0.000000'}
                    <span className="text-emerald-400/60 text-xs ml-1">WETH</span>
                  </p>
                </div>
              </div>

              {claimResult && (
                <div
                  className={cn(
                    'rounded-xl px-4 py-3 text-sm',
                    claimResult.success
                      ? 'bg-emerald-400/10 border border-emerald-400/20 text-emerald-400'
                      : 'bg-red-400/10 border border-red-400/20 text-red-400'
                  )}
                >
                  {claimResult.success ? (
                    claimResult.txHash ? (
                      <div className="flex items-center gap-2">
                        <CheckCircle size={16} className="shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">
                            Claimed {parseFloat(claimResult.amount ?? '0').toFixed(6)} WETH
                          </p>
                          <a
                            href={`https://basescan.org/tx/${claimResult.txHash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-400/80 text-xs hover:underline flex items-center gap-1 mt-0.5"
                          >
                            View on Basescan <ExternalLink size={11} />
                          </a>
                        </div>
                      </div>
                    ) : (
                      <p>{claimResult.message}</p>
                    )
                  ) : (
                    <p>{claimResult.message}</p>
                  )}
                </div>
              )}

              {feeData && parseFloat(feeData.unclaimed) > 0 && (
                <Button
                  className="w-full rounded-xl h-11 text-sm font-bold cursor-pointer gap-2"
                  onClick={onClaimFees}
                  disabled={claimLoading}
                >
                  {claimLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin" /> Claiming...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Coins size={16} /> Claim {parseFloat(feeData.unclaimed).toFixed(6)} WETH
                    </span>
                  )}
                </Button>
              )}
            </>
          )}
        </Card>
      )}

      <Card className="relative overflow-hidden">
        <div className="flex items-start gap-4">
          <img
            src={avatar}
            alt={name}
            width={40}
            height={40}
            className="rounded-full object-cover mt-1 shrink-0"
          />
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold text-base">Direct Message</h3>
            <p className="text-gray text-sm mt-0.5 leading-relaxed">
              Send a direct message for a quick connection. Keep the conversation going with
              additional messages if needed.
            </p>

            <div className="mt-3">
              <Link href={`/${handle}/chat`}>
                <Button size="sm" className="rounded-lg">
                  Start Chat
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </Card>

      {!!proxy.coreBrain && (
        <Card className="relative overflow-hidden">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-purple/10 flex items-center justify-center shrink-0 mt-1">
              <Brain size={20} className="text-purple" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-semibold text-base">View Brain</h3>
              <p className="text-gray text-sm mt-0.5 leading-relaxed">
                Explore how this AI proxy thinks, what it believes, and what topics it knows about.
              </p>
              <div className="mt-3">
                <Link href={`/${handle}/visualize`}>
                  <Button variant="outline" size="sm" className="rounded-lg">
                    <Brain size={14} /> Explore Brain
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
