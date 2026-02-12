"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface IngestionLog {
  id: string;
  proxyId: string;
  proxyHandle: string | null;
  step: string;
  status: string;
  detail: string | null;
  startedAt: string;
  finishedAt: string | null;
}

const STATUS_FILTERS = ["all", "success", "error", "running", "skipped"];

const STATUS_COLORS: Record<string, string> = {
  success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  error: "bg-red-500/10 text-red-400 border-red-500/20",
  running: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  skipped: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
};

const PAGE_SIZE = 30;

function formatDuration(start: string, end: string | null): string {
  if (!end) return "running...";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

export default function AdminIngestionPage() {
  const { getAccessToken } = useAuth();
  const [logs, setLogs] = useState<IngestionLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const token = await getAccessToken?.();
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String(page * PAGE_SIZE),
    });
    if (statusFilter !== "all") params.set("status", statusFilter);

    const res = await fetch(`/api/admin/ingestion?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setLogs(data.rows ?? []);
      setTotal(data.total ?? 0);
    }
    setLoading(false);
  }, [getAccessToken, page, statusFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-[1200px] mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Ingestion Monitoring</h1>
          <p className="text-gray text-sm mt-1">
            {total} total log entr{total === 1 ? "y" : "ies"}
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
                  <th className="text-left px-4 py-3 text-gray text-xs font-medium">Step</th>
                  <th className="text-left px-4 py-3 text-gray text-xs font-medium">Status</th>
                  <th className="text-left px-4 py-3 text-gray text-xs font-medium">Detail</th>
                  <th className="text-left px-4 py-3 text-gray text-xs font-medium">Started</th>
                  <th className="text-left px-4 py-3 text-gray text-xs font-medium">Duration</th>
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
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center text-gray py-12">
                      No ingestion logs found.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr
                      key={log.id}
                      className={cn(
                        "border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors",
                        log.detail && "cursor-pointer"
                      )}
                      onClick={() =>
                        log.detail &&
                        setExpandedId(expandedId === log.id ? null : log.id)
                      }
                    >
                      <td className="px-4 py-3 text-white font-medium">
                        @{log.proxyHandle ?? "unknown"}
                      </td>
                      <td className="px-4 py-3 text-gray">{log.step}</td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border",
                            STATUS_COLORS[log.status] ?? "bg-white/[0.06] text-gray border-white/[0.06]"
                          )}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray text-xs max-w-[300px]">
                        {expandedId === log.id ? (
                          <span className="whitespace-pre-wrap break-words">{log.detail}</span>
                        ) : (
                          <span className="truncate block">{log.detail ?? "-"}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray text-xs whitespace-nowrap">
                        {new Date(log.startedAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-gray text-xs whitespace-nowrap">
                        {formatDuration(log.startedAt, log.finishedAt)}
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
