"use client";

import { useState, useEffect } from "react";
import {
  Wallet,
  Ghost,
  MessageSquare,
  ExternalLink,
  Bot,
  ArrowUpRight,
  ArrowDownToLine,
  ArrowUpFromLine,
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
  const { fundWallet } = useFundWallet({
    onUserExited() {
      // Refresh balance after user exits the funding flow
      getUsdcBalance().then(setUsdcBalance);
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
  const [showWithdraw, setShowWithdraw] = useState(false);

  // Fetch USDC balance
  useEffect(() => {
    if (!walletAddress) return;
    getUsdcBalance().then(setUsdcBalance);
  }, [walletAddress, getUsdcBalance]);

  const handleDeposit = () => {
    if (!walletAddress) return;
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
        if (!cancelled && Array.isArray(data)) setHoldings(data);
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

  const totalValue = holdings.reduce((s, h) => s + h.value, 0);
  const formattedTotal = `$${totalValue.toFixed(2)}`;

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
        {/* Top section: two columns */}
        <div className="flex gap-8">
          {/* Left: portfolio header + chart */}
          <div className="flex-1 min-w-0 space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-white text-2xl font-medium">My portfolio</h1>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-white text-4xl font-bold">
                    {formattedTotal}
                  </span>
                  <span className="text-gray text-sm">0.00%</span>
                </div>
              </div>

              {/* Time range tabs */}
              <div className="flex items-center gap-0.5 bg-white/4 rounded-lg p-0.5">
                {TIME_RANGES.map((r) => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    className={cn(
                      "px-3 py-1.5 text-xs rounded-md cursor-pointer transition-colors",
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

            {/* Chart */}
            <div className="relative h-[160px] w-full">
              <svg
                viewBox="0 0 600 120"
                className="w-full h-full"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgb(190, 242, 100)" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="rgb(190, 242, 100)" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,90 Q50,88 100,85 T200,80 T300,75 T400,70 T500,65 T600,60 L600,120 L0,120 Z"
                  fill="url(#portfolioGrad)"
                />
                <path
                  d="M0,90 Q50,88 100,85 T200,80 T300,75 T400,70 T500,65 T600,60"
                  fill="none"
                  stroke="rgb(190, 242, 100)"
                  strokeWidth="2"
                />
              </svg>
            </div>
          </div>

          {/* Right sidebar */}
          <div className="hidden lg:flex flex-col gap-4 w-[300px] shrink-0">
            {/* Total balance card */}
            <Card className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-white font-semibold text-sm">Total balance</h3>
              </div>

              <span className="text-white text-2xl font-bold block">{formattedTotal}</span>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray text-xs">Portfolio balance</span>
                  <span className="text-white text-xs font-medium">{formattedTotal}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray text-xs">USDC balance</span>
                  <span className="text-white text-xs font-medium">
                    ${parseFloat(usdcBalance).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-lg flex-1 gap-1.5 cursor-pointer"
                  onClick={handleDeposit}
                >
                  <ArrowDownToLine size={13} /> Deposit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-lg flex-1 gap-1.5 cursor-pointer"
                  onClick={() => setShowWithdraw(true)}
                >
                  <ArrowUpFromLine size={13} /> Withdraw
                </Button>
              </div>
            </Card>

            {/* Your Proxy card (if creator) */}
            {createdProxy && (
              <Card className="space-y-3">
                <div className="flex items-center gap-2">
                  <Bot size={14} className="text-lime" />
                  <h3 className="text-white font-semibold text-sm">Your Proxy</h3>
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
                      <p className="text-white text-sm font-medium truncate">
                        {createdProxy.name}
                      </p>
                      <p className="text-gray text-xs">
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
                <span className="text-red-400 text-sm">&#10006;</span>
                <h3 className="text-white font-semibold text-sm">Your referrals</h3>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray text-xs">No. of referrals</span>
                  <span className="text-white text-sm font-semibold">0</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray text-xs">Referral fees earned</span>
                  <span className="text-white text-sm font-semibold">$0.00</span>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Holdings table */}
        <div>
          <h2 className="text-white font-semibold text-lg mb-4">Proxy Holdings</h2>

          {loading ? (
            <Card className="text-center py-8">
              <div className="w-8 h-8 border-2 border-lime/30 border-t-lime rounded-full animate-spin mx-auto mb-2" />
              <p className="text-gray text-xs">Loading holdings...</p>
            </Card>
          ) : !walletAddress ? (
            <Card className="text-center py-8">
              <Wallet size={32} className="text-gray/30 mx-auto mb-2" />
              <p className="text-gray text-sm">Connect your wallet to view holdings</p>
              <p className="text-gray/60 text-xs mt-1">
                Your proxy token balances will appear here
              </p>
            </Card>
          ) : holdings.length === 0 ? (
            <Card className="text-center py-8">
              <Ghost size={32} className="text-gray/30 mx-auto mb-2" />
              <p className="text-gray text-sm">No proxy tokens found</p>
              <p className="text-gray/60 text-xs mt-1">
                Buy proxy tokens on the explore page to see them here
              </p>
            </Card>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray text-xs border-b border-white/6">
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
                            src={h.avatar || "/mock-avatar.jpg"}
                            alt={h.name}
                            width={32}
                            height={32}
                            className="w-8 h-8 rounded-lg object-cover"
                          />
                          <span className="text-white font-medium text-[13px] group-hover:text-lime transition-colors">
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
                      <td className="py-3 text-gray text-sm">
                        {Math.floor(h.amount)} msgs
                      </td>
                      <td className="py-3 text-white font-medium text-sm">
                        ${h.value.toFixed(2)}
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center gap-1.5 justify-end">
                          <Link href={`/${h.handle}/chat`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-[11px] text-gray hover:text-white gap-1"
                            >
                              <MessageSquare size={12} /> Chat
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
                              className="h-7 px-2 text-[11px] text-gray hover:text-white gap-1"
                            >
                              <ExternalLink size={12} /> Trade
                            </Button>
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination placeholder */}
              <div className="flex items-center justify-between mt-4 text-xs text-gray">
                <div className="flex items-center gap-2">
                  <span>Rows</span>
                  <select className="bg-white/6 border border-white/6 rounded px-2 py-1 text-white text-xs">
                    <option>10</option>
                    <option>25</option>
                    <option>50</option>
                  </select>
                </div>
                <span>Page 1 of 1</span>
              </div>
            </div>
          )}
        </div>

        {/* Recent Conversations */}
        <div>
          <h2 className="text-white font-semibold text-lg mb-4">Recent Chats</h2>

          {activityLoading ? (
            <Card className="text-center py-8">
              <div className="w-8 h-8 border-2 border-lime/30 border-t-lime rounded-full animate-spin mx-auto mb-2" />
              <p className="text-gray text-xs">Loading chats...</p>
            </Card>
          ) : !user?.id ? (
            <Card className="text-center py-8">
              <MessageSquare size={32} className="text-gray/30 mx-auto mb-2" />
              <p className="text-gray text-sm">Sign in to view your chat history</p>
            </Card>
          ) : recentChats.length === 0 ? (
            <Card className="text-center py-8">
              <MessageSquare size={32} className="text-gray/30 mx-auto mb-2" />
              <p className="text-gray text-sm">No conversations yet</p>
              <p className="text-gray/60 text-xs mt-1">
                Start chatting with a proxy to see your conversations here
              </p>
            </Card>
          ) : (
            <div className="grid gap-2">
              {recentChats.map((chat) => (
                <Link key={chat.id} href={`/${chat.proxyHandle}/chat`}>
                  <Card className="flex items-center gap-3 p-3 hover:bg-white/4 transition-colors cursor-pointer">
                    {chat.proxyAvatar ? (
                      <Image
                        src={chat.proxyAvatar}
                        alt={chat.proxyName}
                        width={36}
                        height={36}
                        className="rounded-lg object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center text-xs font-bold text-white shrink-0">
                        {chat.proxyName.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white text-sm font-medium truncate">
                          {chat.title}
                        </span>
                      </div>
                      <p className="text-gray text-xs mt-0.5">
                        {chat.proxyName} &middot; {chat.totalMessages} msg{chat.totalMessages !== 1 ? "s" : ""} &middot; {formatTimeAgo(chat.updatedAt)}
                      </p>
                    </div>
                    <ArrowUpRight size={14} className="text-gray shrink-0" />
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {showWithdraw && (
        <WithdrawModal
          onClose={() => setShowWithdraw(false)}
          onSuccess={() => getUsdcBalance().then(setUsdcBalance)}
        />
      )}
    </div>
  );
}
