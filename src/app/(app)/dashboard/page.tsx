import Link from "next/link";
import { TrendingUp, MessageSquare, Users, Zap, Eye, ChevronRight } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProxyCard } from "@/components/proxy/proxy-card";
import { getTrendingProxies } from "@/lib/db/queries";
import { WatchlistSection } from "./watchlist-section";
import { DashboardStats } from "./dashboard-stats";

export default async function DashboardPage() {
  const trending = await getTrendingProxies(4);

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray text-sm mt-0.5">Welcome back to Proxi</p>
        </div>
        <Link href="/setup">
          <Button size="sm">
            <Zap size={14} /> Create Proxi
          </Button>
        </Link>
      </div>

      {/* Stats — client component that fetches real data */}
      <DashboardStats />

      {/* Trending */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold">Trending Proxies</h2>
          <Link href="/explore?category=trending" className="flex items-center gap-1 text-gray text-xs hover:text-white no-underline">
            See all <ChevronRight size={14} />
          </Link>
        </div>
        {trending.length > 0 ? (
          <div className="flex gap-6 overflow-x-auto pb-2 scrollbar-none">
            {trending.map((p) => <ProxyCard key={p.id} proxy={p} />)}
          </div>
        ) : (
          <div className="text-center py-8">
            <TrendingUp size={32} className="text-gray/30 mx-auto mb-2" />
            <p className="text-gray text-sm">No trending proxies yet</p>
            <p className="text-gray/60 text-xs mt-1">Proxies will appear here as the platform grows</p>
          </div>
        )}
      </Card>

      {/* Watchlist — client component that fetches per-user */}
      <WatchlistSection />
    </div>
  );
}
