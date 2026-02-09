"use client";

import { useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

const TIME_RANGES = ["1D", "1W", "1M", "1Y"] as const;

export function PortfolioSection() {
  const [range, setRange] = useState<(typeof TIME_RANGES)[number]>("1D");
  const { walletAddress } = useAuth();

  const [totalValue, setTotalValue] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!walletAddress) {
        if (!cancelled) {
          setTotalValue(0);
          setLoading(false);
        }
        return;
      }
      try {
        const res = await fetch(
          `/api/portfolio?wallet=${encodeURIComponent(walletAddress)}`,
        );
        const holdings: { value: number }[] = await res.json();
        if (!cancelled) {
          const total = Array.isArray(holdings)
            ? holdings.reduce((s, h) => s + (h.value ?? 0), 0)
            : 0;
          setTotalValue(total);
        }
      } catch {
        if (!cancelled) setTotalValue(0);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [walletAddress]);

  const formattedValue = loading ? "..." : `$${totalValue.toFixed(2)}`;

  return (
    <div className="space-y-6 ">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-white text-3xl font-medium">My portfolio</h1>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-white text-5xl font-bold">{formattedValue}</span>
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
                  : "text-gray hover:text-white"
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Simple value bar (chart placeholder removed — no historical data yet) */}
      <div className="relative h-[60px] w-full flex items-end">
        <div
          className="w-full rounded-lg bg-lime/10"
          style={{ height: totalValue > 0 ? "100%" : "4px" }}
        />
      </div>

      <div className="h-px bg-white/6" />

      <div className="flex items-center justify-between">
        <span className="text-white text-base font-medium">Total balance</span>
        <button className="flex items-center gap-1 text-white text-base cursor-pointer bg-transparent border-none">
          {formattedValue} <ChevronDown size={16} className="text-gray" />
        </button>
      </div>

      <div className="h-px bg-white/6" />
    </div>
  );
}
