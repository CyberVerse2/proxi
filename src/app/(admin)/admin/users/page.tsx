"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserRow {
  id: string;
  privyId: string;
  xHandle: string | null;
  displayName: string | null;
  walletAddress: string | null;
  points: number;
  tier: string;
  createdAt: string;
  proxyHandle: string | null;
}

const TIER_COLORS: Record<string, string> = {
  bronze: "bg-amber-700/10 text-amber-500 border-amber-700/20",
  silver: "bg-zinc-400/10 text-zinc-300 border-zinc-400/20",
  gold: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  platinum: "bg-cyan-500/10 text-cyan-300 border-cyan-500/20",
  diamond: "bg-purple-500/10 text-purple-300 border-purple-500/20",
};

const PAGE_SIZE = 20;

export default function AdminUsersPage() {
  const { getAccessToken } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const token = await getAccessToken?.();
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String(page * PAGE_SIZE),
    });
    if (search) params.set("search", search);

    const res = await fetch(`/api/admin/users?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setUsers(data.rows ?? []);
      setTotal(data.total ?? 0);
    }
    setLoading(false);
  }, [getAccessToken, page, search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-[1200px] mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">User Management</h1>
          <p className="text-gray text-sm mt-1">
            {total} total user{total === 1 ? "" : "s"}
          </p>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
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

        {/* Table */}
        <div className="rounded-xl bg-dark2 border border-white/[0.06] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left px-4 py-3 text-gray text-xs font-medium">Handle</th>
                  <th className="text-left px-4 py-3 text-gray text-xs font-medium">Display Name</th>
                  <th className="text-left px-4 py-3 text-gray text-xs font-medium">Wallet</th>
                  <th className="text-right px-4 py-3 text-gray text-xs font-medium">Points</th>
                  <th className="text-left px-4 py-3 text-gray text-xs font-medium">Tier</th>
                  <th className="text-left px-4 py-3 text-gray text-xs font-medium">Proxy</th>
                  <th className="text-left px-4 py-3 text-gray text-xs font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b border-white/[0.04]">
                      {[...Array(7)].map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-white/[0.04] rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center text-gray py-12">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-4 py-3 text-white font-medium">
                        {user.xHandle ? `@${user.xHandle}` : "-"}
                      </td>
                      <td className="px-4 py-3 text-gray">{user.displayName ?? "-"}</td>
                      <td className="px-4 py-3 text-gray text-xs font-mono">
                        {user.walletAddress
                          ? `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}`
                          : "-"}
                      </td>
                      <td className="px-4 py-3 text-right text-white font-medium">
                        {user.points.toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border capitalize",
                            TIER_COLORS[user.tier] ?? "bg-white/[0.06] text-gray border-white/[0.06]"
                          )}
                        >
                          {user.tier}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray text-sm">
                        {user.proxyHandle ? (
                          <span className="text-lime">@{user.proxyHandle}</span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray text-xs">
                        {new Date(user.createdAt).toLocaleDateString()}
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
