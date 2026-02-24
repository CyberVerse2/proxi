'use client';

import { Droplets, ExternalLink, MessageSquare, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatCompact, formatUsd } from '@/lib/utils/formatting';
import type { TokenMarketData } from '@/lib/chain/token';

export function ProxyMarketTab({
  tokenData,
  fallbackPrice,
  fallbackPriceChange,
  fallbackMarketCap,
  fallbackVolume24h,
  fallbackDisplayName,
  fallbackTicker,
  liveMessageCount
}: {
  tokenData?: TokenMarketData | null;
  fallbackPrice: number;
  fallbackPriceChange: number;
  fallbackMarketCap: number;
  fallbackVolume24h: number;
  fallbackDisplayName: string | null;
  fallbackTicker: string | null;
  liveMessageCount: number;
}) {
  const tokenPrice = tokenData?.priceUsd ?? fallbackPrice;
  const tokenChange = tokenData?.priceChange24h ?? fallbackPriceChange;
  const tokenMcap = tokenData?.marketCap ?? fallbackMarketCap;
  const tokenVol = tokenData?.volume24h ?? fallbackVolume24h;
  const tokenLiq = tokenData?.liquidity ?? 0;
  const history = tokenData?.priceHistory ?? [];

  const chartPath =
    history.length >= 2
      ? (() => {
          const prices = history.map((point) => point.price);
          const minPrice = Math.min(...prices);
          const maxPrice = Math.max(...prices);
          const range = maxPrice - minPrice || 1;
          const width = 600;
          const height = 120;
          const padding = 8;

          return prices
            .map((pricePoint, index) => {
              const x = (index / (prices.length - 1)) * width;
              const y = padding + ((maxPrice - pricePoint) / range) * (height - padding * 2);
              return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
            })
            .join(' ');
        })()
      : null;

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex items-center gap-3 mb-3">
          {tokenData?.logo && <img src={tokenData.logo} alt="" width={32} height={32} className="rounded-full" />}
          <div>
            <p className="text-white font-bold text-xl">{tokenData?.symbol ?? fallbackTicker ?? '—'}</p>
            <p className="text-gray text-sm">{tokenData?.name ?? fallbackDisplayName}</p>
          </div>
        </div>
        <div className="flex items-baseline gap-3">
          <span className="text-white text-4xl font-bold">{tokenPrice > 0 ? formatUsd(tokenPrice) : '—'}</span>
          {tokenChange !== 0 && (
            <span
              className={cn('text-sm font-medium', tokenChange > 0 ? 'text-emerald-400' : 'text-red-400')}
            >
              {tokenChange > 0 ? '+' : ''}
              {tokenChange.toFixed(2)}%
            </span>
          )}
        </div>
      </Card>

      {chartPath && (
        <Card className="p-4">
          <p className="text-gray text-sm mb-2">30 Day Price</p>
          <div className="relative h-[160px] w-full">
            <svg viewBox="0 0 600 120" className="w-full h-full" preserveAspectRatio="none">
              <defs>
                <linearGradient id="proxyPriceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor={tokenChange >= 0 ? 'rgb(52,211,153)' : 'rgb(248,113,113)'}
                    stopOpacity="0.15"
                  />
                  <stop
                    offset="100%"
                    stopColor={tokenChange >= 0 ? 'rgb(52,211,153)' : 'rgb(248,113,113)'}
                    stopOpacity="0"
                  />
                </linearGradient>
              </defs>
              <path d={`${chartPath} L600,120 L0,120 Z`} fill="url(#proxyPriceGrad)" />
              <path
                d={chartPath}
                fill="none"
                stroke={tokenChange >= 0 ? 'rgb(52,211,153)' : 'rgb(248,113,113)'}
                strokeWidth="2"
              />
            </svg>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Card>
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp size={14} className="text-gray" />
            <p className="text-gray text-sm">Market Cap</p>
          </div>
          <p className="text-white text-xl font-bold">{tokenMcap > 0 ? formatCompact(tokenMcap) : '—'}</p>
        </Card>
        <Card>
          <div className="flex items-center gap-1.5 mb-1">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-gray"
            >
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
            <p className="text-gray text-sm">24h Volume</p>
          </div>
          <p className="text-white text-xl font-bold">{tokenVol > 0 ? formatCompact(tokenVol) : '—'}</p>
        </Card>
        <Card>
          <div className="flex items-center gap-1.5 mb-1">
            <Droplets size={14} className="text-gray" />
            <p className="text-gray text-sm">Liquidity</p>
          </div>
          <p className="text-white text-xl font-bold">{tokenLiq > 0 ? formatCompact(tokenLiq) : '—'}</p>
        </Card>
        <Card>
          <div className="flex items-center gap-1.5 mb-1">
            <MessageSquare size={14} className="text-gray" />
            <p className="text-gray text-sm">Messages</p>
          </div>
          <p className="text-white text-xl font-bold">{liveMessageCount.toLocaleString()}</p>
        </Card>
      </div>

      {tokenData?.dexUrl && (
        <a href={tokenData.dexUrl} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" className="w-full rounded-lg gap-2">
            Trade on DEX <ExternalLink size={14} />
          </Button>
        </a>
      )}
    </div>
  );
}
