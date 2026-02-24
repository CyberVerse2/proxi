"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { SidebarRow } from "@/components/dashboard/sidebar-row";

interface Holding {
  id: string;
  name: string;
  handle: string;
  avatar: string;
  price: number;
  change24h: number;
}

export function HoldingsWidget() {
  const { walletAddress, authenticated, ready } = useAuth();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!ready || !authenticated || !walletAddress) return;
    fetch(`/api/portfolio?wallet=${encodeURIComponent(walletAddress)}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setHoldings(data);
      })
      .catch(() => {});
  }, [ready, authenticated, walletAddress]);

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold text-base">My holdings</h3>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-gray hover:text-white cursor-pointer bg-transparent border-none transition-colors"
        >
          {collapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
        </button>
      </div>
      {!collapsed && (
        <div className="space-y-2">
          {holdings.length > 0 ? (
            holdings.map((holding) => (
              <SidebarRow
                key={holding.id}
                name={holding.name}
                avatar={holding.avatar}
                price={holding.price}
                change={holding.change24h}
              />
            ))
          ) : (
            <p className="text-gray text-sm py-2">No holdings yet</p>
          )}
        </div>
      )}
    </Card>
  );
}
