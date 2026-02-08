import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, MessageSquare, TrendingUp, DollarSign, BarChart3, Crown, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/ui/stat-card";
import { getProxyByHandle } from "@/lib/db/queries";

interface Props {
  params: Promise<{ handle: string }>;
}

export default async function ProxyDetailPage({ params }: Props) {
  const { handle } = await params;
  const proxy = await getProxyByHandle(handle);

  if (!proxy) return notFound();

  return (
    <div className="max-w-5xl mx-auto px-6 pb-20 space-y-8">
      {/* Unclaimed banner — show if proxy has no creator */}
      {!proxy.creatorId && (
        <Card className="bg-lime/5 border-lime/20 flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Crown size={20} className="text-lime" />
            <div>
              <p className="text-white text-sm font-medium">This proxy is unclaimed</p>
              <p className="text-gray text-xs">Are you @{handle}? Claim your proxy to earn royalties.</p>
            </div>
          </div>
          <Button size="sm">Claim Proxy</Button>
        </Card>
      )}

      {/* Profile header */}
      <div className="flex flex-col md:flex-row gap-6 items-start">
        <img
          src={proxy.avatarUrl ?? "/mock-avatar.jpg"}
          alt={proxy.displayName ?? handle}
          className="w-28 h-28 rounded-2xl object-cover border-2 border-white/6"
        />
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold text-white">{proxy.displayName ?? handle}</h1>
            <BadgeCheck size={22} className="text-blue-400" />
            {proxy.status === "live" && <Badge variant="lime">Live</Badge>}
          </div>
          <p className="text-gray text-sm leading-relaxed max-w-lg">
            {proxy.bio ?? `AI clone powered by Proxi. Chat with this digital twin.`}
          </p>
          <div className="flex items-center gap-3 text-xs text-gray">
            {proxy.ticker && <span>${proxy.ticker}</span>}
            <span>|</span>
            <span>{proxy.totalChats.toLocaleString()} chats</span>
            <span>|</span>
            <span>Rating: {(proxy.rating ?? 0).toFixed(1)}/5</span>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <Link href={`/${handle}/chat`}>
              <Button size="lg">
                <MessageSquare size={18} />
                Chat with Proxi
              </Button>
            </Link>
            <a href={`https://x.com/${handle}`} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">
                <ExternalLink size={14} /> View on X
              </Button>
            </a>
          </div>
        </div>
      </div>

      {/* Token stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Price"
          value={proxy.price ? `$${proxy.price.toFixed(2)}` : "—"}
          change={proxy.priceChange24h ? `${proxy.priceChange24h > 0 ? "+" : ""}${proxy.priceChange24h.toFixed(1)}%` : undefined}
          icon={<DollarSign size={16} />}
        />
        <StatCard
          label="Market Cap"
          value={proxy.marketCap ? `$${(proxy.marketCap / 1000).toFixed(0)}K` : "—"}
          icon={<BarChart3 size={16} />}
        />
        <StatCard
          label="24h Volume"
          value={proxy.volume24h ? `$${(proxy.volume24h / 1000).toFixed(1)}K` : "—"}
          icon={<TrendingUp size={16} />}
        />
        <StatCard
          label="Total Chats"
          value={proxy.totalChats.toLocaleString()}
          icon={<MessageSquare size={16} />}
        />
      </div>

      {/* Earnings / Royalties placeholders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <h3 className="text-white font-semibold mb-1">Creator Earnings</h3>
          <p className="text-gray text-xs mb-3">Total earned from proxy conversations</p>
          <span className="text-3xl font-bold text-lime">$0</span>
        </Card>
        <Card>
          <h3 className="text-white font-semibold mb-1">Royalties</h3>
          <p className="text-gray text-xs mb-3">Percentage of token trading fees</p>
          <span className="text-3xl font-bold text-white">5%</span>
        </Card>
      </div>
    </div>
  );
}
