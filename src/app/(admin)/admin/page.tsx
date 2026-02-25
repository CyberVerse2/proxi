"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Users, Bot, MessageSquare, MessagesSquare, Database, TrendingUp, Droplets, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

interface Stats {
  totalUsers: number;
  totalProxies: number;
  totalMessages: number;
  totalConversations: number;
  totalChunks: number;
  totalVolume24h: number;
  totalLiquidity: number;
  totalMarketCap: number;
  liveTokenCount: number;
  proxyByStatus: Record<string, number>;
}

interface IngestionLog {
  id: string;
  proxyHandle: string | null;
  step: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
}

interface RecentProxy {
  id: string;
  xHandle: string;
  displayName: string | null;
  status: string;
  createdAt: string;
  totalChats: number;
}

interface Revenue {
  claimedWeth: string;
  unclaimedWeth: string;
  totalWeth: string;
  ethPriceUsd: number;
  totalRevenueUsd: number;
}

function formatUsd(value: number): string {
  if (value === 0) return "$0";
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
}

type Period = "24h" | "7d" | "30d" | "all";

const PERIODS: { value: Period; label: string }[] = [
  { value: "24h", label: "24h" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "all", label: "All time" },
];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  building: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  live: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  paused: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  failed: "bg-red-500/10 text-red-400 border-red-500/20",
  success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  error: "bg-red-500/10 text-red-400 border-red-500/20",
  running: "bg-blue-500/10 text-blue-400 border-blue-500/20",
};

export default function AdminOverviewPage() {
  const { ready, authenticated, getAccessToken } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [revenue, setRevenue] = useState<Revenue | null>(null);
  const [recentLogs, setRecentLogs] = useState<IngestionLog[]>([]);
  const [recentProxies, setRecentProxies] = useState<RecentProxy[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>("all");
  const [statsLoading, setStatsLoading] = useState(false);

  const authError = ready && !authenticated ? "unauthorized" : null;

  const getHeaders = useCallback(async () => {
    const token = await getAccessToken?.();
    if (!token) return null;
    return { Authorization: `Bearer ${token}` };
  }, [getAccessToken]);

  const fetchStats = useCallback(async (p: Period) => {
    setStatsLoading(true);
    const headers = await getHeaders();
    if (!headers) { setStatsLoading(false); return; }
    const res = await fetch(`/api/admin/stats?period=${p}`, { headers });
    if (res.ok) setStats(await res.json());
    setStatsLoading(false);
  }, [getHeaders]);

  useEffect(() => {
    if (!ready || !authenticated) return;

    async function load() {
      const headers = await getHeaders();
      if (!headers) { setLoading(false); setApiError("unauthorized"); return; }

      const [statsRes, revenueRes, logsRes, proxiesRes] = await Promise.all([
        fetch(`/api/admin/stats?period=${period}`, { headers }),
        fetch("/api/admin/revenue", { headers }),
        fetch("/api/admin/ingestion?limit=10", { headers }),
        fetch("/api/admin/proxies?limit=5", { headers }),
      ]);

      if (statsRes.status === 401 || statsRes.status === 403) {
        setApiError(statsRes.status === 403 ? "forbidden" : "unauthorized");
        setLoading(false);
        return;
      }

      if (statsRes.ok) setStats(await statsRes.json());
      if (revenueRes.ok) setRevenue(await revenueRes.json());
      if (logsRes.ok) {
        const data = await logsRes.json();
        setRecentLogs(data.rows ?? []);
      }
      if (proxiesRes.ok) {
        const data = await proxiesRes.json();
        setRecentProxies(data.rows ?? []);
      }
      setLoading(false);
    }
    load();
  }, [ready, authenticated, getHeaders, period]);

  const error = authError ?? apiError;

  function handlePeriodChange(p: Period) {
    setPeriod(p);
    fetchStats(p);
  }

  if (error) {
    return (
      <div className="p-6 md:p-8">
        <div className="max-w-[1200px] mx-auto text-center py-20">
          <h1 className="text-2xl font-bold text-white mb-3">
            {error === "forbidden" ? "Access Denied" : "Sign In Required"}
          </h1>
          <p className="text-gray text-sm">
            {error === "forbidden"
              ? "Your account doesn't have admin access."
              : "Sign in with an admin account to view this dashboard."}
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6 md:p-8">
        <div className="max-w-[1200px] mx-auto">
          <h1 className="text-2xl font-bold text-white mb-6">Admin Dashboard</h1>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-[100px] rounded-xl bg-dark2 border border-white/6 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-[1200px] mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-gray text-sm mt-1">Platform overview and monitoring</p>
          </div>
          <div className="flex gap-1.5">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => handlePeriodChange(p.value)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer border",
                  period === p.value
                    ? "bg-lime/10 text-lime border-lime/20"
                    : "bg-white/4 text-gray border-white/6 hover:text-white"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Stat cards */}
        <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 transition-opacity", statsLoading && "opacity-50")}>
          <StatCard
            label="Total Users"
            value={stats?.totalUsers.toLocaleString() ?? "0"}
            icon={<Users size={16} />}
          />
          <StatCard
            label="Total Proxies"
            value={stats?.totalProxies.toLocaleString() ?? "0"}
            icon={<Bot size={16} />}
          />
          <StatCard
            label="Volume (24h)"
            value={formatUsd(stats?.totalVolume24h ?? 0)}
            icon={<TrendingUp size={16} />}
          />
          <StatCard
            label="Total Liquidity"
            value={formatUsd(stats?.totalLiquidity ?? 0)}
            icon={<Droplets size={16} />}
          />
          <StatCard
            label="Total Market Cap"
            value={formatUsd(stats?.totalMarketCap ?? 0)}
            icon={<DollarSign size={16} />}
          />
          <StatCard
            label="Total Messages"
            value={stats?.totalMessages.toLocaleString() ?? "0"}
            icon={<MessageSquare size={16} />}
          />
          <StatCard
            label="Conversations"
            value={stats?.totalConversations.toLocaleString() ?? "0"}
            icon={<MessagesSquare size={16} />}
          />
          <StatCard
            label="Content Chunks"
            value={stats?.totalChunks.toLocaleString() ?? "0"}
            icon={<Database size={16} />}
          />
        </div>

        {/* Revenue card */}
        {revenue && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Platform Revenue (LP Fees)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <span className="text-gray text-xs">Total Revenue</span>
                  <p className="text-white text-2xl font-bold">
                    {formatUsd(revenue.totalRevenueUsd)}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-gray text-xs">Total WETH Earned</span>
                  <p className="text-white text-lg font-semibold">
                    {parseFloat(revenue.totalWeth).toFixed(6)} WETH
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-gray text-xs">Claimed</span>
                  <p className="text-emerald-400 text-lg font-semibold">
                    {parseFloat(revenue.claimedWeth).toFixed(6)} WETH
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-gray text-xs">Unclaimed</span>
                  <p className="text-yellow-400 text-lg font-semibold">
                    {parseFloat(revenue.unclaimedWeth).toFixed(6)} WETH
                  </p>
                </div>
              </div>
              {revenue.ethPriceUsd > 0 && (
                <p className="text-gray/50 text-[11px] mt-3">
                  ETH price: ${revenue.ethPriceUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Proxy status breakdown */}
        {stats?.proxyByStatus && Object.keys(stats.proxyByStatus).length > 0 && (
          <Card className={cn("transition-opacity", statsLoading && "opacity-50")}>
            <CardHeader>
              <CardTitle className="text-base">Proxy Status Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {Object.entries(stats.proxyByStatus).map(([status, count]) => (
                  <div
                    key={status}
                    className="flex items-center gap-2 bg-white/3 rounded-lg px-4 py-3 border border-white/6"
                  >
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${STATUS_COLORS[status] ?? "bg-white/6 text-gray border-white/6"}`}
                    >
                      {status}
                    </span>
                    <span className="text-white font-bold text-lg">{count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent ingestion activity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Ingestion Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {recentLogs.length === 0 ? (
                <p className="text-gray text-sm">No ingestion activity yet.</p>
              ) : (
                <div className="space-y-2">
                  {recentLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between py-2 border-b border-white/4:border-0"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-white text-sm font-medium truncate">
                          @{log.proxyHandle ?? "unknown"}
                        </span>
                        <span className="text-gray text-xs">{log.step}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${STATUS_COLORS[log.status] ?? "bg-white/6-gray border-white/6"}`}
                        >
                          {log.status}
                        </span>
                        <span className="text-gray text-[11px]">
                          {new Date(log.startedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent proxies */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Proxies</CardTitle>
            </CardHeader>
            <CardContent>
              {recentProxies.length === 0 ? (
                <p className="text-gray text-sm">No proxies yet.</p>
              ) : (
                <div className="space-y-2">
                  {recentProxies.map((proxy) => (
                    <div
                      key={proxy.id}
                      className="flex items-center justify-between py-2 border-b border-white/4 last:border-0"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-white text-sm font-medium truncate">
                          @{proxy.xHandle}
                        </span>
                        {proxy.displayName && (
                          <span className="text-gray text-xs truncate">{proxy.displayName}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${STATUS_COLORS[proxy.status] ?? "bg-white/6 text-gray border-white/6"}`}
                        >
                          {proxy.status}
                        </span>
                        <span className="text-gray text-[11px]">
                          {new Date(proxy.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
