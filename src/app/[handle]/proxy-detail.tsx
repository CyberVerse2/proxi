'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BadgeCheck, Copy, Star, Brain, Crown, Heart, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface ProxyData {
  id: string;
  xHandle: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  ticker: string | null;
  status: string;
  tokenAddress: string | null;
  price: number | null;
  priceChange24h: number | null;
  marketCap: number | null;
  volume24h: number | null;
  totalChats: number;
  totalMessages: number;
  rating: number | null;
  coreBrain: unknown;
  creatorId: string | null;
}

const TABS = ['About Me', 'Market'] as const;

const MOCK_REVIEWS = [
  {
    id: '1',
    name: 'Fable',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=fable',
    stars: 5,
    time: '5 months ago',
    text: 'responded thoughtfully'
  },
  {
    id: '2',
    name: 'Ken',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ken',
    stars: 5,
    time: '7 months ago',
    text: null
  },
  {
    id: '3',
    name: 'kepler',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=kepler',
    stars: 5,
    time: '7 months ago',
    text: 'I want ask a further question, but the price goes to high. So I drop the question here. Thanks a lot.'
  }
];

export function ProxyDetail({ proxy }: { proxy: ProxyData }) {
  const [activeTab, setActiveTab] = useState<string>('About Me');
  const [tradeMode, setTradeMode] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('1.0');
  const [amountUnit, setAmountUnit] = useState<'minutes' | 'usd'>('minutes');
  const [copied, setCopied] = useState(false);

  const handle = proxy.xHandle;
  const name = proxy.displayName ?? handle;
  const avatar = proxy.avatarUrl ?? '/mock-avatar.jpg';
  const rating = proxy.rating ?? 0;
  const price = proxy.price ?? 0;
  const priceChange = proxy.priceChange24h ?? 0;

  const copyCA = () => {
    if (proxy.tokenAddress) {
      navigator.clipboard.writeText(proxy.tokenAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const truncateAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;

  return (
    <div className="max-w-[1100px] mx-auto px-6 pb-20">
      <div className="flex gap-8">
        {/* ============ Left Column ============ */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Unclaimed banner */}
          {!proxy.creatorId && (
            <Card className="bg-lime/5 border-lime/20 flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Crown size={20} className="text-lime" />
                <div>
                  <p className="text-white text-sm font-medium">This proxy is unclaimed</p>
                  <p className="text-gray text-xs">
                    Are you @{handle}? Claim your proxy to earn royalties.
                  </p>
                </div>
              </div>
              <Button size="sm" className="rounded-lg">
                Claim Proxy
              </Button>
            </Card>
          )}

          {/* ─── Profile Header ─── */}
          <div className="flex gap-5 items-start">
            <img
              src={avatar}
              alt={name}
              width={110}
              height={110}
              className="rounded-2xl object-cover border-2 border-white/6 shrink-0"
            />

            <div className="space-y-2.5 min-w-0">
              {/* Name row */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-bold text-white">{name}</h1>
                <BadgeCheck size={20} className="text-blue-400 shrink-0" />
                {proxy.status === 'live' && (
                  <Badge variant="lime" className="rounded-lg uppercase">
                    Live
                  </Badge>
                )}
              </div>

              {/* Bio */}
              <p className="text-gray text-sm leading-relaxed">
                {proxy.bio ?? 'AI clone powered by Proxi. Chat with this digital twin.'}
              </p>

              {/* Rating row */}
              <div className="flex items-center gap-1.5 text-sm text-gray">
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={18}
                      className={
                        i < Math.round(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray/30'
                      }
                    />
                  ))}
                </div>
                <span className="text-white font-medium">{rating.toFixed(1)}</span>
                <span>&middot;</span>
                <span>{proxy.totalChats} chats</span>
              </div>

              {/* CA + socials */}
              <div className="flex items-center gap-2 pt-0.5">
                {proxy.tokenAddress && (
                  <button
                    onClick={copyCA}
                    className="flex items-center gap-1.5 bg-white/6 border border-white/8 rounded-lg px-3 py-1.5 text-xs text-gray hover:text-white transition-colors cursor-pointer"
                  >
                    <span>CA: {truncateAddress(proxy.tokenAddress)}</span>
                    <Copy size={12} className={copied ? 'text-lime' : ''} />
                  </button>
                )}
                <a href={`https://x.com/${handle}`} target="_blank" rel="noopener noreferrer">
                  <button className="w-8 h-8 rounded-lg bg-white/6 border border-white/8 flex items-center justify-center text-gray hover:text-white transition-colors cursor-pointer">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </button>
                </a>
              </div>
            </div>
          </div>

          {/* ─── Tabs ─── */}
          <div className="border-b border-white/6">
            <div className="flex gap-6">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    'pb-3 text-sm font-medium border-b-2 transition-colors cursor-pointer',
                    activeTab === tab
                      ? 'border-white text-white'
                      : 'border-transparent text-gray hover:text-white'
                  )}
                >
                  {tab}
                </button>
              ))}
              {/* {!!proxy.coreBrain && (
                <Link
                  href={`/${handle}/visualize`}
                  className="pb-3 text-sm font-medium border-b-2 border-transparent text-gray hover:text-white transition-colors"
                >
                  Brain
                </Link>
              )} */}
            </div>
          </div>

          {/* ─── About Me Tab ─── */}
          {activeTab === 'About Me' && (
            <div className="space-y-6">
              {/* Fan favorite banner */}
              {rating >= 4.0 && (
                <Card className="flex items-center gap-4 p-4">
                  <img
                    src={avatar}
                    alt={name}
                    width={48}
                    height={48}
                    className="rounded-xl object-cover shrink-0"
                  />
                  <div className="space-y-1">
                    <Badge className="bg-pink-500/15 text-pink-400 border-pink-500/20">
                      <Heart size={12} className="fill-pink-400" /> Fan favorite proxy
                    </Badge>
                    <p className="text-gray text-xs">One of the most loved proxies on Proxi</p>
                    <div className="flex items-center gap-1 text-xs text-gray">
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            size={10}
                            className={
                              i < Math.round(rating)
                                ? 'text-yellow-400 fill-yellow-400'
                                : 'text-gray/30'
                            }
                          />
                        ))}
                      </div>
                      <span>{rating.toFixed(1)}</span>
                      <span>&middot;</span>
                      <span>{proxy.totalChats} chats</span>
                    </div>
                  </div>
                </Card>
              )}
              {/* Direct Message card */}
              <Card className="relative overflow-hidden">
                <div className="flex items-start gap-4">
                  <img
                    src={avatar}
                    alt={name}
                    width={40}
                    height={40}
                    className="rounded-full object-cover mt-1 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-semibold text-sm">Direct Message</h3>
                    <p className="text-gray text-xs mt-0.5 leading-relaxed">
                      Send a direct message for a quick connection. Keep the conversation going with
                      additional messages if needed.
                    </p>
                 
                    <div className="mt-3">
                      <Link href={`/${handle}/chat`}>
                        <Button size="sm" className="rounded-lg">
                          Start Chat
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Brain card */}
              {!!proxy.coreBrain && (
                <Card className="relative overflow-hidden">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-purple/10 flex items-center justify-center shrink-0 mt-1">
                      <Brain size={20} className="text-purple" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-semibold text-sm">View Brain</h3>
                      <p className="text-gray text-xs mt-0.5 leading-relaxed">
                        Explore how this AI proxy thinks, what it believes, and what topics it knows
                        about.
                      </p>
                      <div className="mt-3">
                        <Link href={`/${handle}/visualize`}>
                          <Button variant="outline" size="sm" className="rounded-lg">
                            <Brain size={14} /> Explore Brain
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* ─── Market Tab ─── */}
          {activeTab === 'Market' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Card>
                  <p className="text-gray text-xs mb-1">Price</p>
                  <p className="text-white text-xl font-bold">
                    {price > 0 ? `$${price.toFixed(2)}` : '—'}
                  </p>
                  {priceChange !== 0 && (
                    <span
                      className={cn(
                        'text-xs',
                        priceChange > 0 ? 'text-emerald-400' : 'text-red-400'
                      )}
                    >
                      {priceChange > 0 ? '+' : ''}
                      {priceChange.toFixed(1)}%
                    </span>
                  )}
                </Card>
                <Card>
                  <p className="text-gray text-xs mb-1">Market Cap</p>
                  <p className="text-white text-xl font-bold">
                    {proxy.marketCap ? `$${(proxy.marketCap / 1000).toFixed(0)}K` : '—'}
                  </p>
                </Card>
                <Card>
                  <p className="text-gray text-xs mb-1">24h Volume</p>
                  <p className="text-white text-xl font-bold">
                    {proxy.volume24h ? `$${(proxy.volume24h / 1000).toFixed(1)}K` : '—'}
                  </p>
                </Card>
                <Card>
                  <p className="text-gray text-xs mb-1">Total Chats</p>
                  <p className="text-white text-xl font-bold">
                    {proxy.totalChats.toLocaleString()}
                  </p>
                </Card>
              </div>

              {/* Price chart */}
              <div className="relative h-[180px] w-full">
                <svg
                  viewBox="0 0 600 120"
                  className="w-full h-full"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="proxyPriceGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgb(190, 242, 100)" stopOpacity="0.15" />
                      <stop offset="100%" stopColor="rgb(190, 242, 100)" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0,95 Q30,93 60,90 T120,82 T180,78 T240,80 T300,72 T360,68 T420,60 T480,55 T540,50 T600,45 L600,120 L0,120 Z"
                    fill="url(#proxyPriceGrad)"
                  />
                  <path
                    d="M0,95 Q30,93 60,90 T120,82 T180,78 T240,80 T300,72 T360,68 T420,60 T480,55 T540,50 T600,45"
                    fill="none"
                    stroke="rgb(190, 242, 100)"
                    strokeWidth="2"
                  />
                </svg>
              </div>
            </div>
          )}
        </div>

        {/* ============ Right Sidebar ============ */}
        <div className="hidden lg:flex flex-col gap-4 w-[340px] shrink-0">
          {/* ─── Buy/Sell Card ─── */}
          <Card className="space-y-5 p-6">
            {/* Buy/Sell toggle */}
            <div className="flex bg-white/6 rounded-xl p-1">
              <button
                onClick={() => setTradeMode('buy')}
                className={cn(
                  'flex-1 py-2.5 text-sm font-semibold rounded-[10px] transition-colors cursor-pointer',
                  tradeMode === 'buy' ? 'bg-white/12 text-white' : 'text-gray hover:text-white'
                )}
              >
                Buy
              </button>
              <button
                onClick={() => setTradeMode('sell')}
                className={cn(
                  'flex-1 py-2.5 text-sm font-semibold rounded-[10px] transition-colors cursor-pointer',
                  tradeMode === 'sell' ? 'bg-white/12 text-white' : 'text-gray hover:text-white'
                )}
              >
                Sell
              </button>
            </div>

            {/* Price display */}
            <div>
              <div className="flex items-baseline gap-3 mt-1">
                <span className="text-white text-[42px] font-bold leading-tight">
                  ${price.toFixed(2)}
                </span>
                <span
                  className={cn(
                    'text-base font-medium',
                    priceChange >= 0 ? 'text-emerald-400' : 'text-red-400'
                  )}
                >
                  {priceChange >= 0 ? '+' : ''}
                  {priceChange.toFixed(2)}%
                </span>
              </div>
            </div>

            {/* Amount input + unit toggle */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 bg-white/4 border border-white/10 rounded-xl px-3 py-3.5">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="flex-1 min-w-0 bg-transparent text-white text-base font-medium outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder="0.0"
                />
              </div>
              <div className="flex bg-white/6 rounded-xl p-1">
                <button
                  onClick={() => setAmountUnit('minutes')}
                  className={cn(
                    'flex-1 py-2 text-xs font-medium rounded-[10px] transition-colors cursor-pointer',
                    amountUnit === 'minutes'
                      ? 'bg-white/12 text-white'
                      : 'text-gray hover:text-white'
                  )}
                >
                  Minutes
                </button>
                <button
                  onClick={() => setAmountUnit('usd')}
                  className={cn(
                    'flex-1 py-2 text-xs font-medium rounded-[10px] transition-colors cursor-pointer',
                    amountUnit === 'usd' ? 'bg-white/12 text-white' : 'text-gray hover:text-white'
                  )}
                >
                  USD
                </button>
              </div>
            </div>

            {/* Quick amount buttons */}
            <div className="flex gap-2">
              {['15 min', '30 min', 'Max'].map((label) => (
                <button
                  key={label}
                  onClick={() => {
                    if (label === '15 min') setAmount('15');
                    else if (label === '30 min') setAmount('30');
                  }}
                  className="flex-1 py-2.5 text-sm font-medium text-gray border border-white/10 rounded-xl hover:text-white hover:border-white/20 transition-colors cursor-pointer"
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Available balance */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray">Available Balance</span>
              <span className="text-white font-medium">0.00 mins</span>
            </div>

            {/* CTA button */}
            <Button className="w-full rounded-lg h-14! text-base font-bold" size="lg">
              Verify wallet
            </Button>

            <p className="text-gray/40 text-xs text-center flex items-center justify-center gap-1.5">
              <Info size={11} /> Estimate based on current market price
            </p>
          </Card>

          {/* ─── Your Position ─── */}
          <Card className="space-y-3">
            <h3 className="text-white font-semibold text-sm">Your position</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray text-xs">Minutes owned</span>
                <span className="text-white text-sm">—</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray text-xs">Market value</span>
                <span className="text-white text-sm font-medium">$0.00</span>
              </div>
            </div>
          </Card>

          {/* ─── Reviews ─── */}
          <Card className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-white font-semibold text-sm">Reviews</h3>
              <div className="flex items-center gap-1">
                <Star size={12} className="text-yellow-400 fill-yellow-400" />
                <span className="text-white text-xs font-medium">4.8</span>
              </div>
            </div>

            {/* Review list */}
            <div className="space-y-3">
              {MOCK_REVIEWS.map((review) => (
                <div
                  key={review.id}
                  className="border-t border-white/6 pt-3 first:border-0 first:pt-0"
                >
                  <div className="flex items-center gap-2.5">
                    <img
                      src={review.avatar}
                      alt={review.name}
                      width={28}
                      height={28}
                      className="rounded-full object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white text-xs font-semibold">{review.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              size={9}
                              className={
                                i < review.stars
                                  ? 'text-yellow-400 fill-yellow-400'
                                  : 'text-gray/30'
                              }
                            />
                          ))}
                        </div>
                        <span className="text-gray/50 text-[10px]">&middot; {review.time}</span>
                      </div>
                    </div>
                  </div>
                  {review.text && (
                    <p className="text-gray text-xs leading-relaxed mt-1.5 ml-[38px]">
                      {review.text}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <Button variant="outline" size="sm" className="w-full">
              Show all 24 reviews
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
