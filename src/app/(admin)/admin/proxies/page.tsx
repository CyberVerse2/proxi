"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface Proxy {
  id: string;
  xHandle: string;
  displayName: string | null;
  status: string;
  tokenAddress: string | null;
  totalChats: number;
  totalMessages: number;
  rating: number | null;
  createdAt: string;
}

const STATUSES = ["all", "pending", "building", "live", "paused", "failed"];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  building: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  live: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  paused: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  failed: "bg-red-500/10 text-red-400 border-red-500/20",
};

const PAGE_SIZE = 20;

export default function AdminProxiesPage() {
  const { getAccessToken } = useAuth();
  const [proxies, setProxies] = useState<Proxy[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchProxies = useCallback(async () => {
    setLoading(true);
    const token = await getAccessToken?.();
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String(page * PAGE_SIZE),
    });
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (search) params.set("search", search);

    const res = await fetch(`/api/admin/proxies?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setProxies(data.rows ?? []);
      setTotal(data.total ?? 0);
    }
    setLoading(false);
  }, [getAccessToken, page, statusFilter, search]);

  useEffect(() => {
    fetchProxies();
  }, [fetchProxies]);

  async function updateStatus(proxyId: string, newStatus: string) {
    setUpdating(proxyId);
    const token = await getAccessToken?.();
    await fetch("/api/admin/proxies", {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: proxyId, status: newStatus }),
    });
    setUpdating(null);
    fetchProxies();
  }

  async function triggerIngest(proxyId: string) {
    const token = await getAccessToken?.();
    await fetch("/api/proxy/ingest", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ proxyId }),
    });
    fetchProxies();
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-[1200px] mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Proxy Management</h1>
          <p className="text-gray text-sm mt-1">
            {total} total prox{total === 1 ? "y" : "ies"}
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray" />
            <Input
              placeholder="Search by handle..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              className="pl-9"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setStatusFilter(s);
                  setPage(0);
                }}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer border",
                  statusFilter === s
                    ? "bg-lime/10 text-lime border-lime/20"
                    : "bg-white/[0.04] text-gray border-white/[0.06] hover:text-white"
                )}
              >
                {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl bg-dark2 border border-white/[0.06] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left px-4 py-3 text-gray text-xs font-medium">Handle</th>
                  <th className="text-left px-4 py-3 text-gray text-xs font-medium">Display Name</th>
                  <th className="text-left px-4 py-3 text-gray text-xs font-medium">Status</th>
                  <th className="text-left px-4 py-3 text-gray text-xs font-medium">Token</th>
                  <th className="text-right px-4 py-3 text-gray text-xs font-medium">Chats</th>
                  <th className="text-right px-4 py-3 text-gray text-xs font-medium">Messages</th>
                  <th className="text-right px-4 py-3 text-gray text-xs font-medium">Rating</th>
                  <th className="text-left px-4 py-3 text-gray text-xs font-medium">Created</th>
                  <th className="text-right px-4 py-3 text-gray text-xs font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b border-white/[0.04]">
                      {[...Array(9)].map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-white/[0.04] rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : proxies.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center text-gray py-12">
                      No proxies found.
                    </td>
                  </tr>
                ) : (
                  proxies.map((proxy) => (
                    <tr
                      key={proxy.id}
                      className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-4 py-3 text-white font-medium">@{proxy.xHandle}</td>
                      <td className="px-4 py-3 text-gray">{proxy.displayName ?? "-"}</td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border",
                            STATUS_COLORS[proxy.status] ?? "bg-white/[0.06] text-gray border-white/[0.06]"
                          )}
                        >
                          {proxy.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray text-xs font-mono">
                        {proxy.tokenAddress
                          ? `${proxy.tokenAddress.slice(0, 6)}...${proxy.tokenAddress.slice(-4)}`
                          : "-"}
                      </td>
                      <td className="px-4 py-3 text-right text-white">{proxy.totalChats}</td>
                      <td className="px-4 py-3 text-right text-white">{proxy.totalMessages}</td>
                      <td className="px-4 py-3 text-right text-white">
                        {proxy.rating ? proxy.rating.toFixed(1) : "-"}
                      </td>
                      <td className="px-4 py-3 text-gray text-xs">
                        {new Date(proxy.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <select
                            value={proxy.status}
                            onChange={(e) => updateStatus(proxy.id, e.target.value)}
                            disabled={updating === proxy.id}
                            className="bg-white/[0.04] border border-white/[0.06] text-white text-xs rounded-lg px-2 py-1 cursor-pointer focus:outline-none focus:border-lime/30"
                          >
                            {STATUSES.filter((s) => s !== "all").map((s) => (
                              <option key={s} value={s} className="bg-dark2">
                                {s}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => triggerIngest(proxy.id)}
                            title="Re-ingest"
                            className="p-1.5 rounded-lg text-gray hover:text-lime hover:bg-lime/10 transition-colors cursor-pointer"
                          >
                            <RefreshCw size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <span className="text-gray text-sm">
              Page {page + 1} of {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft size={14} />
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
                <ChevronRight size={14} />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
