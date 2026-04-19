'use client';

import Link from 'next/link';
import { BadgeCheck, Copy, Crown, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

const TABS = ['About Me', 'Market', 'Reviews'] as const;

export function ProxyDetailHeader({
  creatorId,
  handle,
  avatar,
  name,
  status,
  bio,
  rating,
  totalChats,
  tokenAddress,
  copied,
  onCopyTokenAddress,
  activeTab,
  onTabChange
}: {
  creatorId: string | null;
  handle: string;
  avatar: string;
  name: string;
  status: string;
  bio: string | null;
  rating: number;
  totalChats: number;
  tokenAddress: string | null;
  copied: boolean;
  onCopyTokenAddress: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
}) {
  const truncateAddress = (address: string) => `${address.slice(0, 6)}...${address.slice(-4)}`;

  return (
    <>
      {!creatorId && (
        <Card className="bg-lime/5 border-lime/20 flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Crown size={20} className="text-lime" />
            <div>
              <p className="text-white text-base font-medium">This proxy is unclaimed</p>
              <p className="text-gray text-sm">Are you @{handle}? Claim your proxy to receive creator payouts.</p>
            </div>
          </div>
          <Link href={`/${handle}/claim`}>
            <Button size="sm" className="rounded-lg">
              Claim Proxy
            </Button>
          </Link>
        </Card>
      )}

      <div className="flex gap-5 items-start">
        <img
          src={avatar}
          alt={name}
          width={120}
          height={120}
          className="rounded-2xl object-cover border-2 border-white/6 shrink-0"
        />

        <div className="space-y-2.5 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-3xl font-bold text-white">{name}</h1>
            <BadgeCheck size={22} className="text-blue-400 shrink-0" />
            {status === 'live' && (
              <Badge variant="lime" className="rounded-lg uppercase">
                Live
              </Badge>
            )}
          </div>

          <p className="text-gray text-base leading-relaxed">
            {bio ?? 'AI clone powered by Proxi. Chat with this digital twin.'}
          </p>

          <div className="flex items-center gap-2 text-base text-gray">
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={20}
                  className={i < Math.round(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray/30'}
                />
              ))}
            </div>
            <span className="text-white font-medium">{rating.toFixed(1)}</span>
            <span>&middot;</span>
            <span>{totalChats} chats</span>
          </div>

          <div className="flex items-center gap-2 pt-0.5">
            {tokenAddress && (
              <button
                onClick={onCopyTokenAddress}
                className="flex items-center gap-1.5 bg-white/6 border border-white/8 rounded-lg px-3.5 py-2 text-sm text-gray hover:text-white transition-colors cursor-pointer"
              >
                <span>CA: {truncateAddress(tokenAddress)}</span>
                <Copy size={14} className={copied ? 'text-lime' : ''} />
              </button>
            )}
            <a href={`https://x.com/${handle}`} target="_blank" rel="noopener noreferrer">
              <button className="w-9 h-9 rounded-lg bg-white/6 border border-white/8 flex items-center justify-center text-gray hover:text-white transition-colors cursor-pointer">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </button>
            </a>
          </div>
        </div>
      </div>

      <div className="border-b border-white/6">
        <div className="flex gap-6">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              className={cn(
                'pb-3 text-base font-medium border-b-2 transition-colors cursor-pointer',
                activeTab === tab ? 'border-white text-white' : 'border-transparent text-gray hover:text-white'
              )}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
