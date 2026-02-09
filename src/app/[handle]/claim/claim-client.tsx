"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Copy,
  ExternalLink,
  Crown,
  Gem,
  Loader2,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import type { TokenMarketData } from "@/lib/chain/token";
import type { ClaimFeeData, TokenHolder } from "./page";

interface ProxyInfo {
  id: string;
  xHandle: string;
  displayName: string;
  avatarUrl: string | null;
  tokenAddress: string | null;
  ticker: string | null;
  creatorId: string | null;
}

interface ClaimClientProps {
  proxy: ProxyInfo;
  tokenData: TokenMarketData | null;
  feeData: ClaimFeeData | null;
  creatorInfo: { xHandle: string | null; avatarUrl: string | null } | null;
  holders: TokenHolder[];
}

export function ClaimClient({
  proxy,
  tokenData,
  feeData,
  creatorInfo,
  holders,
}: ClaimClientProps) {
  const router = useRouter();
  const { ready, authenticated, xHandle, login, getAccessToken } = useAuth();

  const [claimLoading, setClaimLoading] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedHolder, setCopiedHolder] = useState<string | null>(null);

  const isOwner =
    authenticated &&
    xHandle?.toLowerCase() === proxy.xHandle.toLowerCase();
  const isClaimed = !!proxy.creatorId;
  const baseScanUrl = proxy.tokenAddress
    ? `https://basescan.org/token/${proxy.tokenAddress}`
    : null;
  const dexScreenerUrl = proxy.tokenAddress
    ? `https://dexscreener.com/base/${proxy.tokenAddress}`
    : null;

  const handleClaim = async () => {
    setClaimLoading(true);
    setClaimError(null);
    try {
      const token = await getAccessToken?.();
      if (!token) {
        setClaimError("Failed to get auth token. Please try signing in again.");
        return;
      }

      const res = await fetch("/api/proxy/claim", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ handle: proxy.xHandle }),
      });

      const data = await res.json();
      if (!res.ok) {
        setClaimError(data.error ?? "Failed to claim proxy");
        return;
      }

      router.push(`/${proxy.xHandle}/claim/setup`);
    } catch {
      setClaimError("Something went wrong. Please try again.");
    } finally {
      setClaimLoading(false);
    }
  };

  const copyAddress = () => {
    if (proxy.tokenAddress) {
      navigator.clipboard.writeText(proxy.tokenAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const truncate = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <div className="min-h-screen bg-black text-white flex justify-center p-4 pt-24">
      <div className="w-full max-w-lg space-y-5">
        {/* ─── Header ─── */}
        <div className="flex flex-col items-center text-center space-y-3">
          {proxy.avatarUrl && (
            <img
              src={proxy.avatarUrl}
              alt={proxy.displayName}
              width={96}
              height={96}
              className="rounded-2xl border-2 border-white/6 object-cover"
            />
          )}
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-2xl font-bold">{proxy.displayName}</h1>
              {proxy.ticker && (
                <Badge variant="lime" className="uppercase">
                  ${proxy.ticker}
                </Badge>
              )}
            </div>
            <p className="text-gray text-sm">@{proxy.xHandle}</p>
          </div>
        </div>

        {/* ─── Stats Row (if token exists) ─── */}
        {proxy.tokenAddress && tokenData && (
          <div className="flex gap-3">
            <div className="flex-1 bg-white/4 rounded-xl px-3 py-2.5 text-center">
              <p className="text-gray text-[11px] font-medium">MCAP</p>
              <p className="text-white text-sm font-bold">
                {tokenData.marketCap > 0
                  ? formatCompact(tokenData.marketCap)
                  : "—"}
              </p>
            </div>
            <div className="flex-1 bg-white/4 rounded-xl px-3 py-2.5 text-center">
              <p className="text-gray text-[11px] font-medium">24H VOL</p>
              <p className="text-white text-sm font-bold">
                {tokenData.volume24h > 0
                  ? formatCompact(tokenData.volume24h)
                  : "—"}
              </p>
            </div>
            <div className="flex-1 bg-white/4 rounded-xl px-3 py-2.5 text-center">
              <p className="text-gray text-[11px] font-medium">PRICE</p>
              <p className="text-white text-sm font-bold">
                {tokenData.priceUsd > 0
                  ? formatUsd(tokenData.priceUsd)
                  : "—"}
              </p>
            </div>
          </div>
        )}

        {/* ─── Info Card ─── */}
        <Card className="space-y-4">
          {/* Token address */}
          {proxy.tokenAddress && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray">Contract</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyAddress}
                  className="flex items-center gap-1.5 text-gray hover:text-white transition-colors cursor-pointer"
                >
                  <span className="font-mono text-xs">
                    {truncate(proxy.tokenAddress)}
                  </span>
                  <Copy
                    size={12}
                    className={copied ? "text-lime" : ""}
                  />
                </button>
                <a
                  href={baseScanUrl!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray hover:text-white transition-colors"
                >
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>
          )}

          {/* Creator */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray">Creator</span>
            <a
              href={`https://x.com/${proxy.xHandle}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white hover:text-lime transition-colors flex items-center gap-1.5"
            >
              @{proxy.xHandle}
              <ExternalLink size={12} />
            </a>
          </div>

          {/* Claim status */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray">Status</span>
            {isClaimed ? (
              <div className="flex items-center gap-1.5 text-lime">
                <CheckCircle size={14} />
                <span>Claimed</span>
              </div>
            ) : (
              <Badge variant="outline" className="text-yellow-400 border-yellow-400/20">
                <Crown size={12} /> Unclaimed
              </Badge>
            )}
          </div>

          {/* Earnings */}
          {feeData && feeData.totalUsd > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray flex items-center gap-1.5">
                <Gem size={14} className="text-purple" /> Earnings
              </span>
              <span className="text-white font-semibold">
                {formatCompact(feeData.totalUsd)}
              </span>
            </div>
          )}
        </Card>

        {/* ─── Claim Section ─── */}
        <Card className="space-y-4">
          {!ready ? (
            <div className="text-center py-4 text-gray text-sm">
              Loading...
            </div>
          ) : !authenticated ? (
            /* Not authenticated */
            <>
              <div className="text-center space-y-2">
                <h2 className="text-lg font-semibold text-white">
                  Claim Your Proxy
                </h2>
                <p className="text-sm text-gray">
                  Are you @{proxy.xHandle}? Sign in with X to claim your earned fees ({formatCompact(feeData?.totalUsd ?? 0)} so far) and start earning more.
                </p>
              </div>
              <Button onClick={login} className="w-full rounded-xl h-11">
                Sign in with X
              </Button>
            </>
          ) : isClaimed && isOwner ? (
            /* Already claimed (owner) */
            <div className="space-y-4">
              <div className="flex items-center gap-2 rounded-xl bg-lime/10 border border-lime/20 px-4 py-3 text-sm text-lime">
                <CheckCircle size={16} />
                <span>You&apos;ve claimed this proxy</span>
              </div>
              <div className="flex gap-3">
                <Link href={`/${proxy.xHandle}/claim/setup`} className="flex-1">
                  <Button variant="outline" className="w-full rounded-xl">
                    Setup Form
                  </Button>
                </Link>
                <Link href={`/${proxy.xHandle}`} className="flex-1">
                  <Button className="w-full rounded-xl">
                    View Proxy
                  </Button>
                </Link>
              </div>
            </div>
          ) : isClaimed ? (
            /* Already claimed (non-owner) */
            <div className="text-center py-2 space-y-2">
              <div className="flex items-center justify-center gap-2 text-lime text-sm">
                <CheckCircle size={16} />
                <span>This proxy has been claimed</span>
              </div>
              <p className="text-gray text-xs">
                Claimed by @{creatorInfo?.xHandle ?? proxy.xHandle}
              </p>
            </div>
          ) : isOwner ? (
            /* Authenticated, correct account, unclaimed */
            <div className="space-y-4">
              <div className="text-center space-y-2">
                <h2 className="text-lg font-semibold text-white">
                  Claim Your Proxy
                </h2>
                <p className="text-sm text-gray">
                  Verified as @{xHandle}. Claim this proxy to start earning
                  LP fees and customize your AI clone.
                </p>
              </div>

              {claimError && (
                <div className="rounded-xl bg-red-400/10 border border-red-400/20 px-4 py-3 text-sm text-red-400">
                  {claimError}
                </div>
              )}

              <Button
                onClick={handleClaim}
                disabled={claimLoading}
                className="w-full rounded-xl h-11"
              >
                {claimLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin" /> Claiming...
                  </span>
                ) : (
                  "Verify & Claim"
                )}
              </Button>
            </div>
          ) : (
            /* Authenticated, different account, unclaimed */
            <div className="text-center space-y-2 py-2">
              <h2 className="text-lg font-semibold text-white">
                Unclaimed Proxy
              </h2>
              <p className="text-sm text-gray">
                This proxy can be claimed by @{proxy.xHandle}.
              </p>
            </div>
          )}
        </Card>

        {/* ─── Action Buttons ─── */}
        <div className="flex gap-3">
          <Link href={`/${proxy.xHandle}/chat`} className="flex-1">
            <Button variant="secondary" className="w-full rounded-xl">
              Chat with Proxy
            </Button>
          </Link>
          {dexScreenerUrl && (
            <a
              href={dexScreenerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1"
            >
              <Button variant="secondary" className="w-full rounded-xl">
                DexScreener <ExternalLink size={14} />
              </Button>
            </a>
          )}
        </div>

        {/* Back link */}
        <div className="text-center">
          <Link
            href={`/${proxy.xHandle}`}
            className="text-sm text-gray hover:text-white transition-colors"
          >
            View proxy profile
          </Link>
        </div>

        {/* ─── Top 100 Holders ─── */}
        {holders.length > 0 && (
          <div className="space-y-4 pt-2">
            <div className="border-t border-white/6 pt-6">
              <h2 className="text-white text-lg font-bold">
                Top {holders.length} Holders
              </h2>
            </div>

            <div className="space-y-2">
              {holders.map((holder, i) => (
                <div
                  key={holder.address}
                  className="flex items-center gap-3 rounded-xl border border-white/6 bg-white/[0.02] px-4 py-3"
                >
                  {/* Rank */}
                  <span className="text-gray text-sm font-medium w-5 shrink-0 text-center">
                    {i + 1}
                  </span>

                  {/* Avatar placeholder */}
                  <div className="w-8 h-8 rounded-full bg-white/8 flex items-center justify-center shrink-0">
                    <span className="text-gray text-xs">
                      {holder.label
                        ? holder.label.charAt(0).toUpperCase()
                        : ""}
                    </span>
                  </div>

                  {/* Address + label */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-white text-sm font-medium">
                        {truncate(holder.address)}
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(holder.address);
                          setCopiedHolder(holder.address);
                          setTimeout(() => setCopiedHolder(null), 2000);
                        }}
                        className="text-gray hover:text-white transition-colors cursor-pointer"
                      >
                        <Copy
                          size={12}
                          className={
                            copiedHolder === holder.address ? "text-lime" : ""
                          }
                        />
                      </button>
                    </div>
                    {holder.label && (
                      <p className="text-gray text-xs">{holder.label}</p>
                    )}
                  </div>

                  {/* Percentage + amount */}
                  <div className="text-right shrink-0">
                    <p className="text-white text-sm font-bold">
                      {holder.percentage.toFixed(2)}%
                    </p>
                    <p className="text-gray text-xs">{holder.amount}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Formatting helpers ─── */

function formatUsd(value: number): string {
  if (value >= 1) return `$${value.toFixed(2)}`;
  if (value >= 0.01) return `$${value.toFixed(4)}`;
  return `$${value.toFixed(8).replace(/0+$/, "")}`;
}

function formatCompact(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(2)}`;
}
