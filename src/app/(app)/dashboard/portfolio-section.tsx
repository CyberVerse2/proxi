"use client";

import { useState, useEffect, useMemo } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { Sparkline, generateSparklineData } from "@/components/ui/sparkline";
import Image from "next/image";
import { DEFAULT_AVATAR } from "@/lib/config/constants";

const TIME_RANGES = ["1D", "1W", "1M", "1Y"] as const;

interface Holding {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  amount: number;
  value: number;
  tokenAddress: string;
}

export function PortfolioSection() {
  const [range, setRange] = useState<(typeof TIME_RANGES)[number]>("1D");
  const [expanded, setExpanded] = useState(false);
  const { walletAddress } = useAuth();

  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [usdcBalance, setUsdcBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!walletAddress) {
        if (!cancelled) {
          setHoldings([]);
          setUsdcBalance(0);
          setLoading(false);
        }
        return;
      }
      try {
        const res = await fetch(
          `/api/portfolio?wallet=${encodeURIComponent(walletAddress)}`,
        );
        const data = await res.json();
        if (!cancelled) {
          const h = Array.isArray(data.holdings) ? data.holdings : [];
          setHoldings(h);
          setUsdcBalance(data.usdcBalance ?? 0);
        }
      } catch {
        if (!cancelled) {
          setHoldings([]);
          setUsdcBalance(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [walletAddress]);

  const tokensValue = holdings.reduce((s, h) => s + (h.value ?? 0), 0);
  const totalValue = tokensValue + usdcBalance;
  const formattedValue = loading ? "..." : `$${totalValue.toFixed(2)}`;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const sparklineData = useMemo(
    () => generateSparklineData(totalValue),
    [totalValue],
  );

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-white text-3xl font-medium">My portfolio</h1>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-white text-5xl font-bold">
              {formattedValue}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-0.5 bg-white/4 rounded-lg p-0.5">
          {TIME_RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                "px-4 py-2 text-sm rounded-md cursor-pointer transition-colors",
                range === r
                  ? "bg-white/10 text-white"
                  : "text-gray hover:text-white",
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Sparkline chart */}
      <Sparkline data={sparklineData} height={80} />

      <div className="h-px bg-white/6" />

      {/* Total balance with expand toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full cursor-pointer bg-transparent border-none"
      >
        <span className="text-white text-base font-medium">Total balance</span>
        <span className="flex items-center gap-1 text-white text-base">
          {formattedValue}
          {expanded ? (
            <ChevronUp size={16} className="text-gray" />
          ) : (
            <ChevronDown size={16} className="text-gray" />
          )}
        </span>
      </button>

      {/* Breakdown */}
      {expanded && !loading && (
        <div className="space-y-2 pb-1">
          {/* USDC */}
          <div className="flex items-center justify-between px-1 py-2 rounded-lg hover:bg-white/4 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-xs font-bold">
                $
              </div>
              <div>
                <p className="text-white text-sm font-medium">USDC</p>
                <p className="text-gray text-xs">Stablecoin</p>
              </div>
            </div>
            <span className="text-white text-sm font-medium">
              ${usdcBalance.toFixed(2)}
            </span>
          </div>

          {/* Token holdings */}
          {holdings.map((h) => (
            <div
              key={h.id}
              className="flex items-center justify-between px-1 py-2 rounded-lg hover:bg-white/4 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Image
                  src={h.avatar || DEFAULT_AVATAR}
                  alt={h.name}
                  width={32}
                  height={32}
                  className="rounded-full object-cover"
                />
                <div>
                  <p className="text-white text-sm font-medium">{h.name}</p>
                  <p className="text-gray text-xs">
                    {h.amount.toLocaleString()} tokens
                  </p>
                </div>
              </div>
              <span className="text-white text-sm font-medium">
                ${h.value.toFixed(2)}
              </span>
            </div>
          ))}

          {holdings.length === 0 && usdcBalance === 0 && (
            <p className="text-gray text-sm text-center py-2">
              No holdings yet
            </p>
          )}
        </div>
      )}

      <div className="h-px bg-white/6" />
    </div>
  );
}
