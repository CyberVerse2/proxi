"use client";

import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Wallet, Ghost } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

const TIME_RANGES = ["1D", "1W", "1M", "3M", "ALL"] as const;

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
  const [range, setRange] = useState<typeof TIME_RANGES[number]>("1W");
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    if (!authenticated || !walletAddress) {
      setLoading(false);
      return;
    }

    // Fetch holdings from our DB (proxy tokens the wallet holds)
    fetch(`/api/portfolio?wallet=${encodeURIComponent(walletAddress)}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setHoldings(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [ready, authenticated, walletAddress]);

  const totalValue = holdings.reduce((s, h) => s + h.value, 0);

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Portfolio</h1>
          <p className="text-gray text-sm mt-0.5">Your proxy token holdings</p>
        </div>
        {walletAddress ? (
          <div className="flex items-center gap-2 text-xs text-gray">
            <Wallet size={14} />
            {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
          </div>
        ) : (
          <Button variant="outline" size="sm">
            <Wallet size={14} /> Connect Wallet
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard
          label="Total Value"
          value={totalValue > 0 ? `$${totalValue.toLocaleString()}` : "$0"}
          icon={<TrendingUp size={16} />}
        />
        <StatCard label="Holdings" value={holdings.length.toString()} icon={<Wallet size={16} />} />
        <StatCard label="24h P&L" value="—" icon={<TrendingUp size={16} />} />
      </div>

      {/* Time range */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold">Balance Chart</h2>
          <div className="flex gap-1">
            {TIME_RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={cn(
                  "px-2.5 py-1 text-[11px] rounded-md cursor-pointer transition-colors",
                  range === r ? "bg-lime/10 text-lime" : "text-gray hover:text-white"
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        <div className="h-[200px] flex items-center justify-center text-gray/30 text-sm border border-dashed border-white/6 rounded-lg">
          {walletAddress
            ? "Price chart coming soon"
            : "Connect your wallet to see your portfolio chart"}
        </div>
      </Card>

      {/* Holdings table */}
      <Card>
        <h2 className="text-white font-semibold mb-4">Holdings</h2>
        {loading ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-2 border-lime/30 border-t-lime rounded-full animate-spin mx-auto mb-2" />
            <p className="text-gray text-xs">Loading holdings...</p>
          </div>
        ) : !walletAddress ? (
          <div className="text-center py-8">
            <Wallet size={32} className="text-gray/30 mx-auto mb-2" />
            <p className="text-gray text-sm">Connect your wallet to view holdings</p>
            <p className="text-gray/60 text-xs mt-1">Your proxy token balances will appear here</p>
          </div>
        ) : holdings.length === 0 ? (
          <div className="text-center py-8">
            <Ghost size={32} className="text-gray/30 mx-auto mb-2" />
            <p className="text-gray text-sm">No proxy tokens found</p>
            <p className="text-gray/60 text-xs mt-1">Buy proxy tokens on the explore page to see them here</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray text-xs border-b border-white/6">
                  <th className="text-left pb-3 font-medium">Proxy</th>
                  <th className="text-right pb-3 font-medium">Price</th>
                  <th className="text-right pb-3 font-medium">Amount</th>
                  <th className="text-right pb-3 font-medium">Value</th>
                  <th className="text-right pb-3 font-medium">24h</th>
                </tr>
              </thead>
              <tbody>
                {holdings.map((h) => (
                  <tr key={h.id} className="border-b border-white/3 hover:bg-white/2">
                    <td className="py-3">
                      <div className="flex items-center gap-2.5">
                        <img src={h.avatar} alt={h.name} className="w-8 h-8 rounded-full object-cover" />
                        <div>
                          <span className="text-white font-medium text-[13px]">{h.name}</span>
                          <span className="text-gray text-xs block">@{h.handle}</span>
                        </div>
                      </div>
                    </td>
                    <td className="text-right text-white">${h.price.toFixed(2)}</td>
                    <td className="text-right text-gray">{h.amount.toLocaleString()}</td>
                    <td className="text-right text-white font-medium">${h.value.toLocaleString()}</td>
                    <td className="text-right">
                      <span className={cn("flex items-center justify-end gap-1", h.change24h >= 0 ? "text-emerald-400" : "text-red-400")}>
                        {h.change24h >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {h.change24h >= 0 ? "+" : ""}{h.change24h.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
