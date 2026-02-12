"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface QueueItem {
  id: string;
  proxyId: string;
  proxyHandle: string | null;
  question: string;
  answer: string | null;
  status: string;
  createdAt: string;
  answeredAt: string | null;
}

const STATUS_FILTERS = ["all", "pending", "answered", "skipped"];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  answered: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  skipped: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
};

const PAGE_SIZE = 20;

export default function AdminQueuePage() {
  const { getAccessToken } = useAuth();
  const [items, setItems] = useState<QueueItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const token = await getAccessToken?.();
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String(page * PAGE_SIZE),
    });
    if (statusFilter !== "all") params.set("status", statusFilter);

    const res = await fetch(`/api/admin/queue?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setItems(data.rows ?? []);
      setTotal(data.total ?? 0);
    }
    setLoading(false);
  }, [getAccessToken, page, statusFilter]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-[1200px] mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Queue Management</h1>
          <p className="text-gray text-sm mt-1">
            {total} total flagged question{total === 1 ? "" : "s"}
          </p>
        </div>

        {/* Filters */}
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_FILTERS.map((s) => (
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

        {/* Table */}
        <div className="rounded-xl bg-dark2 border border-white/[0.06] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left px-4 py-3 text-gray text-xs font-medium">Proxy</th>
                  <th className="text-left px-4 py-3 text-gray text-xs font-medium">Question</th>
                  <th className="text-left px-4 py-3 text-gray text-xs font-medium">Status</th>
                  <th className="text-left px-4 py-3 text-gray text-xs font-medium">Created</th>
                  <th className="text-left px-4 py-3 text-gray text-xs font-medium">Answered At</th>
                  <th className="w-10 px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b border-white/[0.04]">
                      {[...Array(6)].map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-white/[0.04] rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center text-gray py-12">
                      No flagged questions found.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => {
                    const isExpanded = expandedId === item.id;
                    return (
                      <tr
                        key={item.id}
                        className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="px-4 py-3 text-white font-medium align-top">
                          @{item.proxyHandle ?? "unknown"}
                        </td>
                        <td className="px-4 py-3 text-gray max-w-[400px] align-top">
                          <p className="text-white text-sm">{item.question}</p>
                          {isExpanded && item.answer && (
                            <div className="mt-2 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                              <span className="text-[10px] uppercase tracking-wider text-gray/50 font-medium">
                                Answer
                              </span>
                              <p className="text-gray text-sm mt-1 whitespace-pre-wrap">
                                {item.answer}
                              </p>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <span
                            className={cn(
                              "inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border",
                              STATUS_COLORS[item.status] ??
                                "bg-white/[0.06] text-gray border-white/[0.06]"
                            )}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray text-xs whitespace-nowrap align-top">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-gray text-xs whitespace-nowrap align-top">
                          {item.answeredAt
                            ? new Date(item.answeredAt).toLocaleDateString()
                            : "-"}
                        </td>
                        <td className="px-4 py-3 align-top">
                          {item.answer && (
                            <button
                              onClick={() =>
                                setExpandedId(isExpanded ? null : item.id)
                              }
                              className="p-1 rounded text-gray hover:text-white transition-colors cursor-pointer"
                            >
                              {isExpanded ? (
                                <ChevronUp size={14} />
                              ) : (
                                <ChevronDown size={14} />
                              )}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
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
