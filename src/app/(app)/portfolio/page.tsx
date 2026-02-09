"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { DEFAULT_AVATAR } from "@/lib/config/constants";
import { Sparkline, generateSparklineData } from "@/components/ui/sparkline";
import {
  Wallet,
  Ghost,
  MessageSquare,
  ExternalLink,
  Bot,
  ArrowUpRight,
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCircle,
  X,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useSwap } from "@/hooks/use-swap";
import { useFundWallet } from "@privy-io/react-auth";
import { WithdrawModal } from "@/components/modals/withdraw-modal";
import { base } from "viem/chains";
import Image from "next/image";
import Link from "next/link";

const TIME_RANGES = ["1D", "1W", "1M", "1Y"] as const;

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

interface CreatedProxy {
  id: string;
  handle: string;
  name: string;
  avatar: string | null;
  status: string;
  totalChats: number;
  totalMessages: number;
  tokenAddress: string | null;
}

interface RecentChat {
  id: string;
  title: string;
  updatedAt: string;
  totalMessages: number;
  proxyHandle: string;
  proxyName: string;
  proxyAvatar: string | null;
}

export default function PortfolioPage() {
  const { walletAddress, authenticated, ready, user } = useAuth();
  const { getUsdcBalance } = useSwap();
  const balanceBeforeRef = useRef<string | null>(null);
  const { fundWallet } = useFundWallet({
    onUserExited() {
      // Refresh balance after user exits the funding flow
      getUsdcBalance().then((newBal) => {
        const before = parseFloat(balanceBeforeRef.current ?? "0");
        const after = parseFloat(newBal);
        if (after > before + 0.001) {
          const deposited = (after - before).toFixed(2);
          setSuccessNotif({ type: "deposit", amount: deposited });
          setTimeout(() => setSuccessNotif(null), 6000);
        }
        setUsdcBalance(newBal);
        balanceBeforeRef.current = null;
      });
    },
  });
  const [range, setRange] = useState<(typeof TIME_RANGES)[number]>("1D");
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [createdProxy, setCreatedProxy] = useState<CreatedProxy | null>(null);
  const [recentChats, setRecentChats] = useState<RecentChat[]>([]);
  const shouldFetch = ready && authenticated && !!walletAddress;
  const [loading, setLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);
  const [usdcBalance, setUsdcBalance] = useState("0");
  const [usdcLoading, setUsdcLoading] = useState(true);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [successNotif, setSuccessNotif] = useState<{
    type: "deposit" | "withdraw";
    amount: string;
  } | null>(null);

  // Fetch USDC balance
  useEffect(() => {
    if (!walletAddress) {
      const id = requestAnimationFrame(() => setUsdcLoading(false));
      return () => cancelAnimationFrame(id);
    }
    let cancelled = false;
    getUsdcBalance().then((bal) => {
      if (!cancelled) {
        setUsdcBalance(bal);
        setUsdcLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [walletAddress, getUsdcBalance]);

  const handleDeposit = () => {
    if (!walletAddress) return;
    // Save current balance to detect change when Privy modal closes
    balanceBeforeRef.current = usdcBalance;
    fundWallet({
      address: walletAddress,
      options: {
        chain: base,
        asset: "USDC",
      },
    });
  };

  // Fetch on-chain holdings
  useEffect(() => {
    if (!shouldFetch) {
      const id = requestAnimationFrame(() => setLoading(false));
      return () => cancelAnimationFrame(id);
    }

    let cancelled = false;
    fetch(`/api/portfolio?wallet=${encodeURIComponent(walletAddress!)}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        const h = Array.isArray(data.holdings) ? data.holdings : Array.isArray(data) ? data : [];
        setHoldings(h);
        if (data.usdcBalance != null) setUsdcBalance(String(data.usdcBalance));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [shouldFetch, walletAddress]);

  // Fetch activity (created proxy + recent chats)
  useEffect(() => {
    if (!user?.id) {
      const id = requestAnimationFrame(() => setActivityLoading(false));
      return () => cancelAnimationFrame(id);
    }

    let cancelled = false;
    fetch(`/api/portfolio/activity?privyId=${encodeURIComponent(user.id)}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.createdProxy) setCreatedProxy(data.createdProxy);
        if (Array.isArray(data.recentChats)) setRecentChats(data.recentChats);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setActivityLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const tokensValue = holdings.reduce((s, h) => s + h.value, 0);
  const totalValue = tokensValue + parseFloat(usdcBalance || "0");
  const formattedTotal = `$${totalValue.toFixed(2)}`;

  // Build sparkline from cumulative holding values
  const sparklineData = useMemo(() => {
    if (holdings.length === 0) return generateSparklineData(totalValue);
    // Build cumulative curve from holdings sorted by value
    const sorted = [...holdings].sort((a, b) => a.value - b.value);
    const cumulative: number[] = [0];
    let running = 0;
    for (const h of sorted) {
      running += h.value;
      cumulative.push(running);
    }
    // Pad to at least 12 points for a smooth line
    while (cumulative.length < 12) {
      cumulative.unshift(cumulative[0] * 0.9);
    }
    return cumulative;
  }, [holdings, totalValue]);

  // Stable reference for relative time formatting
  const [now] = useState(() => Date.now());
  const formatTimeAgo = (dateStr: string) => {
    const diff = now - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  return (
    <div className="p-6 md:p-8 pt-8 flex justify-center">
      <div className="w-full max-w-[1200px] space-y-10">
        {/* Success notification */}
        {successNotif && (
          <div className="flex items-center gap-3 bg-emerald-400/10 border border-emerald-400/20 rounded-xl px-4 py-3 animate-in fade-in slide-in-from-top-2 duration-300">
            <CheckCircle size={20} className="text-emerald-400 shrink-0" />
            <p className="text-emerald-400 text-sm font-medium flex-1">
              {successNotif.type === "deposit"
                ? `Deposit successful! ${successNotif.amount ? `$${successNotif.amount} USDC` : "USDC"} added to your wallet.`
                : "Withdrawal sent! Your USDC is on its way."}
            </p>
            <button
              onClick={() => setSuccessNotif(null)}
              className="text-emerald-400/60 hover:text-emerald-400 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Top section: two columns */}
        <div className="flex gap-8">
          {/* Left: portfolio header + chart */}
          <div className="flex-1 min-w-0 space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-white text-3xl font-medium">My portfolio</h1>
                <div className="flex items-baseline gap-2 mt-1">
                  {loading ? (
                    <div className="h-12 w-40 bg-white/6 rounded-lg animate-pulse mt-1" />
                  ) : (
                    <span className="text-white text-5xl font-bold">
                      {formattedTotal}
                    </span>
                  )}
                  {/* Historical change data not yet available */}
                </div>
              </div>

              {/* Time range tabs */}
              <div className="flex items-center gap-0.5 bg-white/4 rounded-lg p-0.5">
                {TIME_RANGES.map((r) => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    className={cn(
                      "px-4 py-2 text-sm rounded-md cursor-pointer transition-colors",
                      range === r
                        ? "bg-white/10 text-white"
                        : "text-gray hover:text-white"
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Portfolio sparkline chart */}
            <Sparkline data={sparklineData} height={100} />
          </div>

          {/* Right sidebar */}
          <div className="hidden lg:flex flex-col gap-4 w-[300px] shrink-0">
            {/* Total balance card */}
            <Card className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-semibold text-base">Total balance</h3>
              </div>

              {loading ? (
                <div className="h-8 w-28 bg-white/6 rounded animate-pulse" />
              ) : (
                <span className="text-white text-3xl font-bold block">{formattedTotal}</span>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray text-sm">Portfolio balance</span>
                  {loading ? (
                    <div className="h-4 w-16 bg-white/6 rounded animate-pulse" />
                  ) : (
                    <span className="text-white text-sm font-medium">{formattedTotal}</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray text-sm">USDC balance</span>
                  {usdcLoading ? (
                    <div className="h-4 w-16 bg-white/6 rounded animate-pulse" />
                  ) : (
                    <span className="text-white text-sm font-medium">
                      ${parseFloat(usdcBalance).toFixed(2)}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-lg flex-1 gap-1.5 cursor-pointer"
                  onClick={handleDeposit}
                >
                  <ArrowDownToLine size={15} /> Deposit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-lg flex-1 gap-1.5 cursor-pointer"
                  onClick={() => setShowWithdraw(true)}
                >
                  <ArrowUpFromLine size={15} /> Withdraw
                </Button>
              </div>
            </Card>

            {/* Your Proxy card (if creator) */}
            {createdProxy && (
              <Card className="space-y-3">
                <div className="flex items-center gap-2">
                  <Bot size={16} className="text-lime" />
                  <h3 className="text-white font-semibold text-base">Your Proxy</h3>
                </div>
                <Link href={`/${createdProxy.handle}`}>
                  <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/4 transition-colors cursor-pointer">
                    {createdProxy.avatar ? (
                      <Image
                        src={createdProxy.avatar}
                        alt={createdProxy.name}
                        width={40}
                        height={40}
                        className="rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-sm font-bold text-white">
                        {createdProxy.name.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-base font-medium truncate">
                        {createdProxy.name}
                      </p>
                      <p className="text-gray text-sm">
                        {createdProxy.totalChats} chats &middot; {createdProxy.totalMessages} msgs
                      </p>
                    </div>
                    <ArrowUpRight size={14} className="text-gray shrink-0" />
                  </div>
                </Link>
              </Card>
            )}

            {/* Referrals card */}
            <Card className="space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="text-white font-semibold text-base">Referrals</h3>
                <span className="text-xs text-lime bg-lime/10 border border-lime/20 rounded-full px-2 py-0.5 font-medium">Coming Soon</span>
              </div>

              <p className="text-gray text-sm">
                Referral tracking and fee sharing is coming soon. Stay tuned!
              </p>
            </Card>
          </div>
        </div>

        {/* Holdings table */}
        <div>
          <h2 className="text-white font-semibold text-xl mb-4">Proxy Holdings</h2>

          {loading ? (
            <Card className="text-center py-8">
              <div className="w-8 h-8 border-2 border-lime/30 border-t-lime rounded-full animate-spin mx-auto mb-2" />
              <p className="text-gray text-sm">Loading holdings...</p>
            </Card>
          ) : !walletAddress ? (
            <Card className="text-center py-8">
              <Wallet size={32} className="text-gray/30 mx-auto mb-2" />
              <p className="text-gray text-base">Connect your wallet to view holdings</p>
              <p className="text-gray/60 text-sm mt-1">
                Your proxy token balances will appear here
              </p>
            </Card>
          ) : holdings.length === 0 ? (
            <Card className="text-center py-8">
              <Ghost size={32} className="text-gray/30 mx-auto mb-2" />
              <p className="text-gray text-base">No proxy tokens found</p>
              <p className="text-gray/60 text-sm mt-1">
                Buy proxy tokens on the explore page to see them here
              </p>
            </Card>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-base">
                <thead>
                  <tr className="text-gray text-sm border-b border-white/6">
                    <th className="text-left pb-3 font-medium">Proxy</th>
                    <th className="text-left pb-3 font-medium">24h Trend</th>
                    <th className="text-left pb-3 font-medium">Messages</th>
                    <th className="text-left pb-3 font-medium">Value</th>
                    <th className="text-right pb-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {holdings.map((h) => (
                    <tr
                      key={h.id}
                      className="border-b border-white/3 hover:bg-white/2 group"
                    >
                      <td className="py-3">
                        <Link href={`/${h.handle}`} className="flex items-center gap-2.5">
                          <Image
                            src={h.avatar || DEFAULT_AVATAR}
                            alt={h.name}
                            width={32}
                            height={32}
                            className="w-8 h-8 rounded-lg object-cover"
                          />
                          <span className="text-white font-medium text-sm group-hover:text-lime transition-colors">
                            {h.name}
                          </span>
                        </Link>
                      </td>
                      <td className="py-3">
                        <span
                          className={cn(
                            "text-sm",
                            h.change24h >= 0
                              ? "text-emerald-400"
                              : "text-red-400"
                          )}
                        >
                          {h.change24h >= 0 ? "+" : ""}
                          {h.change24h.toFixed(2)}%
                        </span>
                      </td>
                      <td className="py-3 text-gray text-base">
                        {Math.floor(h.amount)} msgs
                      </td>
                      <td className="py-3 text-white font-medium text-base">
                        ${h.value.toFixed(2)}
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center gap-1.5 justify-end">
                          <Link href={`/${h.handle}/chat`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-3 text-xs text-gray hover:text-white gap-1.5"
                            >
                              <MessageSquare size={14} /> Chat
                            </Button>
                          </Link>
                          <a
                            href={`https://dexscreener.com/base/${h.tokenAddress}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-3 text-xs text-gray hover:text-white gap-1.5"
                            >
                              <ExternalLink size={14} /> Trade
                            </Button>
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Holdings count */}
              <div className="flex items-center justify-end mt-4 text-sm text-gray">
                <span>{holdings.length} holding{holdings.length !== 1 ? "s" : ""}</span>
              </div>
            </div>
          )}
        </div>

        {/* Recent Conversations */}
        <div>
          <h2 className="text-white font-semibold text-xl mb-4">Recent Chats</h2>

          {activityLoading ? (
            <Card className="text-center py-8">
              <div className="w-8 h-8 border-2 border-lime/30 border-t-lime rounded-full animate-spin mx-auto mb-2" />
              <p className="text-gray text-sm">Loading chats...</p>
            </Card>
          ) : !user?.id ? (
            <Card className="text-center py-8">
              <MessageSquare size={32} className="text-gray/30 mx-auto mb-2" />
              <p className="text-gray text-base">Sign in to view your chat history</p>
            </Card>
          ) : recentChats.length === 0 ? (
            <Card className="text-center py-8">
              <MessageSquare size={32} className="text-gray/30 mx-auto mb-2" />
              <p className="text-gray text-base">No conversations yet</p>
              <p className="text-gray/60 text-sm mt-1">
                Start chatting with a proxy to see your conversations here
              </p>
            </Card>
          ) : (
            <div className="grid gap-2">
              {recentChats.map((chat) => (
                <Link key={chat.id} href={`/${chat.proxyHandle}/chat`}>
                    <Card className="flex items-center gap-3.5 p-4 hover:bg-white/4 transition-colors cursor-pointer">
                    {chat.proxyAvatar ? (
                      <Image
                        src={chat.proxyAvatar}
                        alt={chat.proxyName}
                        width={40}
                        height={40}
                        className="rounded-lg object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-sm font-bold text-white shrink-0">
                        {chat.proxyName.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white text-base font-medium truncate">
                          {chat.title}
                        </span>
                      </div>
                      <p className="text-gray text-sm mt-0.5">
                        {chat.proxyName} &middot; {chat.totalMessages} msg{chat.totalMessages !== 1 ? "s" : ""} &middot; {formatTimeAgo(chat.updatedAt)}
                      </p>
                    </div>
                    <ArrowUpRight size={16} className="text-gray shrink-0" />
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {showWithdraw && (
        <WithdrawModal
          onClose={() => {
            setShowWithdraw(false);
          }}
          onSuccess={() => {
            getUsdcBalance().then(setUsdcBalance);
            setSuccessNotif({ type: "withdraw", amount: "" });
            setTimeout(() => setSuccessNotif(null), 6000);
          }}
        />
      )}
    </div>
  );
}
