"use client";

import { useState, useEffect } from "react";
import { Wallet, Ghost, Gift } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import Image from "next/image";

const TIME_RANGES = ["1D", "1W", "1M", "1Y"] as const;

interface Holding {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  amount: number;
  value: number;
  change24h: number;
  price: number;
  tokenAddress: string;
}

export default function PortfolioPage() {
  const { walletAddress, authenticated, ready } = useAuth();
  const [range, setRange] = useState<(typeof TIME_RANGES)[number]>("1D");
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const shouldFetch = ready && authenticated && !!walletAddress;
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!shouldFetch) {
      // Derive loading=false without calling setState synchronously
      const id = requestAnimationFrame(() => setLoading(false));
      return () => cancelAnimationFrame(id);
    }

    let cancelled = false;
    fetch(`/api/portfolio?wallet=${encodeURIComponent(walletAddress!)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && Array.isArray(data)) setHoldings(data);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [shouldFetch, walletAddress]);

  const totalValue = holdings.reduce((s, h) => s + h.value, 0);
  const formattedTotal = `$${totalValue.toFixed(2)}`;

  return (
    <div className="p-6 md:p-8 pt-8 flex justify-center">
      <div className="w-full max-w-[1200px] space-y-10">
        {/* Top section: two columns */}
        <div className="flex gap-8">
          {/* Left: portfolio header + chart */}
          <div className="flex-1 min-w-0 space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-white text-2xl font-medium">My portfolio</h1>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-white text-4xl font-bold">
                    {formattedTotal}
                  </span>
                  <span className="text-gray text-sm">0.00%</span>
                </div>
              </div>

              {/* Time range tabs */}
              <div className="flex items-center gap-0.5 bg-white/4 rounded-lg p-0.5">
                {TIME_RANGES.map((r) => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    className={cn(
                      "px-3 py-1.5 text-xs rounded-md cursor-pointer transition-colors",
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

            {/* Chart */}
            <div className="relative h-[160px] w-full">
              <svg
                viewBox="0 0 600 120"
                className="w-full h-full"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgb(190, 242, 100)" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="rgb(190, 242, 100)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,90 Q50,88 100,85 T200,80 T300,75 T400,70 T500,65 T600,60 L600,120 L0,120 Z"
                  fill="url(#portfolioGrad)"
                />
                <path
                  d="M0,90 Q50,88 100,85 T200,80 T300,75 T400,70 T500,65 T600,60"
                  fill="none"
                  stroke="rgb(190, 242, 100)"
                  strokeWidth="2"
                />
              </svg>
            </div>
          </div>

          {/* Right sidebar */}
          <div className="hidden lg:flex flex-col gap-4 w-[300px] shrink-0">
            {/* Total balance card */}
            <Card className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-semibold text-sm">Total balance</h3>
                <Button variant="secondary" size="sm" className="h-7 px-3 text-[11px] gap-1.5">
                  <Gift size={12} /> Gift
                </Button>
              </div>

              <span className="text-white text-2xl font-bold block">{formattedTotal}</span>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray text-xs">Portfolio balance</span>
                  <span className="text-white text-xs font-medium">{formattedTotal}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray text-xs">Available balance</span>
                  <span className="text-white text-xs font-medium">$0.00</span>
                </div>
              </div>

              <Button variant="outline" size="sm" className="rounded-lg w-full">
                Withdraw
              </Button>
            </Card>

            {/* Referrals card */}
            <Card className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-red-400 text-sm">&#10006;</span>
                <h3 className="text-white font-semibold text-sm">Your referrals</h3>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray text-xs">No. of referrals</span>
                  <span className="text-white text-sm font-semibold">0</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray text-xs">Referral fees earned</span>
                  <span className="text-white text-sm font-semibold">$0.00</span>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Holdings table */}
        <div>
          <h2 className="text-white font-semibold text-lg mb-4">Proxy Holdings</h2>

          {loading ? (
            <Card className="text-center py-8">
              <div className="w-8 h-8 border-2 border-lime/30 border-t-lime rounded-full animate-spin mx-auto mb-2" />
              <p className="text-gray text-xs">Loading holdings...</p>
            </Card>
          ) : !walletAddress ? (
            <Card className="text-center py-8">
              <Wallet size={32} className="text-gray/30 mx-auto mb-2" />
              <p className="text-gray text-sm">Connect your wallet to view holdings</p>
              <p className="text-gray/60 text-xs mt-1">
                Your proxy token balances will appear here
              </p>
            </Card>
          ) : holdings.length === 0 ? (
            <Card className="text-center py-8">
              <Ghost size={32} className="text-gray/30 mx-auto mb-2" />
              <p className="text-gray text-sm">No proxy tokens found</p>
              <p className="text-gray/60 text-xs mt-1">
                Buy proxy tokens on the explore page to see them here
              </p>
            </Card>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray text-xs border-b border-white/6">
                    <th className="text-left pb-3 font-medium">User</th>
                    <th className="text-left pb-3 font-medium">24h Trend</th>
                    <th className="text-left pb-3 font-medium">Minutes Held</th>
                    <th className="text-left pb-3 font-medium">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {holdings.map((h) => (
                    <tr
                      key={h.id}
                      className="border-b border-white/3 hover:bg-white/2"
                    >
                      <td className="py-3">
                        <div className="flex items-center gap-2.5">
                          <Image
                            src={h.avatar || "/mock-avatar.jpg"}
                            alt={h.name}
                            width={32}
                            height={32}
                            className="w-8 h-8 rounded-lg object-cover"
                          />
                          <span className="text-white font-medium text-[13px]">
                            {h.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3">
                        <span
                          className={cn(
                            "text-sm",
                            h.change24h >= 0
                              ? "text-emerald-400"
                              : "text-red-400"
                          )}
                        >
                          {h.change24h >= 0 ? "+" : ""}
                          {h.change24h.toFixed(2)}%
                        </span>
                      </td>
                      <td className="py-3 text-gray text-sm">
                        {h.amount.toFixed(2)}
                      </td>
                      <td className="py-3 text-white font-medium text-sm">
                        ${h.value.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination placeholder */}
              <div className="flex items-center justify-between mt-4 text-xs text-gray">
                <div className="flex items-center gap-2">
                  <span>Rows</span>
                  <select className="bg-white/6 border border-white/6 rounded px-2 py-1 text-white text-xs">
                    <option>10</option>
                    <option>25</option>
                    <option>50</option>
                  </select>
                </div>
                <span>Page 1 of 1</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
