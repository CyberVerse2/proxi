'use client';

import { useEffect, useState } from 'react';
import { DEFAULT_AVATAR } from '@/lib/config/constants';
import Link from 'next/link';
import {
  Settings,
  MessageSquare,
  BarChart3,
  Users,
  Zap,
  ExternalLink,
  RefreshCw,
  Ghost,
  Coins,
  Loader2
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/ui/stat-card';
import { useAuth } from '@/hooks/use-auth';
import type { Proxy } from '@/lib/db/schema';

export default function MyProxyPage() {
  const { user, authenticated, ready, walletAddress } = useAuth();
  const [proxy, setProxy] = useState<Proxy | null>(null);
  const [loading, setLoading] = useState(true);
  const [tokenizing, setTokenizing] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [tokenSuccess, setTokenSuccess] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!authenticated || !user?.id) {
      setLoading(false);
      return;
    }

    fetch(`/api/user/me?privyId=${encodeURIComponent(user.id)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.proxy) setProxy(data.proxy);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [ready, authenticated, user?.id]);

  if (loading) {
    return (
      <div className="p-6 md:p-8 flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-lime/30 border-t-lime rounded-full animate-spin" />
      </div>
    );
  }

  if (!proxy) {
    return (
      <div className="p-6 md:p-8 flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-lime/10 flex items-center justify-center">
          <Zap size={32} className="text-lime" />
        </div>
        <h1 className="text-2xl font-bold text-white">Create Your Proxi</h1>
        <p className="text-gray text-sm max-w-md">
          Build an AI clone of yourself powered by your X data. Let the world chat with your digital
          twin.
        </p>
        <Link href="/setup">
          <Button size="lg">
            <Zap size={16} /> Start Setup
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img
            src={proxy.avatarUrl ?? DEFAULT_AVATAR}
            alt={proxy.displayName ?? 'My Proxy'}
            className="w-14 h-14 rounded-2xl object-cover"
          />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-white">{proxy.displayName ?? 'My Proxi'}</h1>
              <Badge variant="lime" className="capitalize">
                {proxy.status}
              </Badge>
            </div>
            <p className="text-gray text-sm">
              @{proxy.xHandle}
              {proxy.ticker && <> &middot; ${proxy.ticker}</>}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {!proxy.tokenAddress && walletAddress && (
            <Button
              variant="outline"
              size="sm"
              disabled={tokenizing}
              onClick={async () => {
                if (!user?.id || !walletAddress) return;
                setTokenizing(true);
                setTokenError(null);
                setTokenSuccess(false);
                try {
                  const res = await fetch('/api/proxy/tokenize', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ privyId: user.id, walletAddress })
                  });
                  const data = await res.json();
                  if (!res.ok) {
                    setTokenError(data.error ?? 'Token deployment failed');
                  } else {
                    setTokenSuccess(true);
                    // Refresh proxy data
                    const meRes = await fetch(
                      `/api/user/me?privyId=${encodeURIComponent(user.id)}`
                    );
                    const meData = await meRes.json();
                    if (meData.proxy) setProxy(meData.proxy);
                  }
                } catch (err) {
                  setTokenError(
                    err instanceof Error ? err.message : 'Unexpected error during deployment'
                  );
                }
                setTokenizing(false);
              }}
            >
              {tokenizing ? <Loader2 size={14} className="animate-spin" /> : <Coins size={14} />}
              {tokenizing ? 'Deploying...' : 'Tokenize'}
            </Button>
          )}
          <Button variant="outline" size="sm">
            <RefreshCw size={14} /> Refresh Brain
          </Button>
          <Link href="/setup">
            <Button variant="secondary" size="sm">
              <Settings size={14} /> Configure
            </Button>
          </Link>
        </div>
      </div>

      {/* Token deployment feedback */}
      {tokenError && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <span className="shrink-0">&#9888;</span>
          <span>{tokenError}</span>
          <button
            onClick={() => setTokenError(null)}
            className="ml-auto text-red-400/60 hover:text-red-400 transition-colors"
          >
            &times;
          </button>
        </div>
      )}
      {tokenSuccess && (
        <div className="flex items-center gap-2 rounded-xl border border-lime/30 bg-lime/10 px-4 py-3 text-sm text-lime">
          <span className="shrink-0">&#10003;</span>
          <span>Token deployed successfully!</span>
          <button
            onClick={() => setTokenSuccess(false)}
            className="ml-auto text-lime/60 hover:text-lime transition-colors"
          >
            &times;
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Total Chats"
          value={proxy.totalChats.toLocaleString()}
          icon={<MessageSquare size={16} />}
        />
        <StatCard
          label="Total Messages"
          value={proxy.totalMessages.toLocaleString()}
          icon={<BarChart3 size={16} />}
        />
        <StatCard
          label="Rating"
          value={`${(proxy.rating ?? 0).toFixed(1)}/5`}
          icon={<Zap size={16} />}
        />
        <StatCard
          label="Price"
          value={proxy.price ? `$${proxy.price.toFixed(2)}` : '—'}
          icon={<BarChart3 size={16} />}
        />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="hover:border-lime/20 transition-colors cursor-pointer">
          <Link href="/dashboard/queue" className="space-y-2 no-underline block">
            <MessageSquare size={20} className="text-lime" />
            <h3 className="text-white font-medium text-sm">Question Queue</h3>
            <p className="text-gray text-xs">Review pending questions</p>
          </Link>
        </Card>
        <Card className="hover:border-lime/20 transition-colors cursor-pointer">
          <Link href="/setup" className="space-y-2 no-underline block">
            <Settings size={20} className="text-lime" />
            <h3 className="text-white font-medium text-sm">Configure</h3>
            <p className="text-gray text-xs">Adjust voice, knowledge, pricing</p>
          </Link>
        </Card>
        <Card className="hover:border-lime/20 transition-colors cursor-pointer">
          <Link href={`/${proxy.xHandle}`} className="space-y-2 no-underline block">
            <ExternalLink size={20} className="text-lime" />
            <h3 className="text-white font-medium text-sm">View Public Page</h3>
            <p className="text-gray text-xs">See your proxy as others see it</p>
          </Link>
        </Card>
      </div>
    </div>
  );
}
