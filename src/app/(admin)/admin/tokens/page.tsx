"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";

interface TokenRow {
  id: string;
  proxyId: string;
  proxyHandle: string | null;
  tokenAddress: string;
  chain: string;
  deployedAt: string;
  metadata: Record<string, unknown> | null;
  marketCap: number | null;
  volume24h: number | null;
  price: number | null;
}

const PAGE_SIZE = 20;

function formatUsd(value: number | null): string {
  if (value == null || value === 0) return "-";
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
}

function getExplorerUrl(address: string, chain: string): string {
  if (chain === "base") return `https://basescan.org/token/${address}`;
  return `https://etherscan.io/token/${address}`;
}

export default function AdminTokensPage() {
  const { getAccessToken } = useAuth();
  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchTokens = useCallback(async () => {
    setLoading(true);
    const token = await getAccessToken?.();
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String(page * PAGE_SIZE),
    });

    const res = await fetch(`/api/admin/tokens?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setTokens(data.rows ?? []);
      setTotal(data.total ?? 0);
    }
    setLoading(false);
  }, [getAccessToken, page]);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-6 md:p-8">
      <div className="max-w-[1200px] mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Token Deployments</h1>
          <p className="text-gray text-sm mt-1">
            {total} deployed token{total === 1 ? "" : "s"}
          </p>
        </div>

        {/* Table */}
        <div className="rounded-xl bg-dark2 border border-white/[0.06] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left px-4 py-3 text-gray text-xs font-medium">Proxy</th>
                  <th className="text-left px-4 py-3 text-gray text-xs font-medium">
                    Token Address
                  </th>
                  <th className="text-left px-4 py-3 text-gray text-xs font-medium">Chain</th>
                  <th className="text-right px-4 py-3 text-gray text-xs font-medium">Price</th>
                  <th className="text-right px-4 py-3 text-gray text-xs font-medium">
                    Market Cap
                  </th>
                  <th className="text-right px-4 py-3 text-gray text-xs font-medium">
                    Volume 24h
                  </th>
                  <th className="text-left px-4 py-3 text-gray text-xs font-medium">
                    Deployed
                  </th>
                  <th className="w-10 px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b border-white/[0.04]">
                      {[...Array(8)].map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-white/[0.04] rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : tokens.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center text-gray py-12">
                      No tokens deployed yet.
                    </td>
                  </tr>
                ) : (
                  tokens.map((token) => (
                    <tr
                      key={token.id}
                      className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-4 py-3 text-white font-medium">
                        @{token.proxyHandle ?? "unknown"}
                      </td>
                      <td className="px-4 py-3 text-gray text-xs font-mono">
                        {token.tokenAddress.slice(0, 6)}...{token.tokenAddress.slice(-4)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 capitalize">
                          {token.chain}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-white">
                        {token.price ? `$${token.price.toFixed(6)}` : "-"}
                      </td>
                      <td className="px-4 py-3 text-right text-white">
                        {formatUsd(token.marketCap)}
                      </td>
                      <td className="px-4 py-3 text-right text-white">
                        {formatUsd(token.volume24h)}
                      </td>
                      <td className="px-4 py-3 text-gray text-xs whitespace-nowrap">
                        {new Date(token.deployedAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <a
                          href={getExplorerUrl(token.tokenAddress, token.chain)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg text-gray hover:text-lime hover:bg-lime/10 transition-colors inline-flex"
                        >
                          <ExternalLink size={14} />
                        </a>
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
