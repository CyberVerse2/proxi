'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  BadgeCheck,
  Copy,
  Star,
  Brain,
  Crown,
  Gem,
  Info,
  ExternalLink,
  Droplets,
  TrendingUp,
  MessageSquare,
  Pencil,
  Loader2,
  ArrowLeftRight,
  DollarSign,
  Coins,
  CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { useSwap } from '@/hooks/use-swap';
import { MESSAGE_PRICE_USD, MIN_BUY_MESSAGES, DEFAULT_AVATAR, SLIPPAGE_BPS, SWAP_FEE_BPS } from '@/lib/config/constants';
import type { TokenMarketData } from '@/lib/chain/token';

interface ProxyData {
  id: string;
  xHandle: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  ticker: string | null;
  status: string;
  tokenAddress: string | null;
  chatPrice: number | null;
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

export interface ReviewItem {
  id: string;
  score: number;
  text: string | null;
  createdAt: string;
  name: string;
  handle: string | null;
  avatar: string | null;
}

const TABS = ['About Me', 'Market', 'Reviews'] as const;

interface FeeData {
  claimed: string;
  unclaimed: string;
  total: string;
  totalUsd: number;
}

export function ProxyDetail({
  proxy,
  feeData,
  tokenData,
  liveMessageCount = 0,
  reviews: initialReviews = []
}: {
  proxy: ProxyData;
  feeData?: FeeData | null;
  tokenData?: TokenMarketData | null;
  liveMessageCount?: number;
  reviews?: ReviewItem[];
}) {
  const [activeTab, setActiveTab] = useState<string>('About Me');
  const [tradeMode, setTradeMode] = useState<'buy' | 'sell'>('buy');
  const [denomination, setDenomination] = useState<'messages' | 'usd'>('messages');
  const [amount, setAmount] = useState('5');
  const [copied, setCopied] = useState(false);

  // Auth + Swap
  const {
    user,
    walletAddress,
    login,
    authenticated,
    xHandle: authXHandle,
    xDisplayName: authDisplayName,
    xProfileImageUrl: authAvatar
  } = useAuth();
  const {
    getPrice,
    executeSwap,
    getUsdcBalance,
    getTokenBalance,
    loading: swapLoading,
    error: swapError
  } = useSwap(proxy.chatPrice ?? undefined);

  // Balances & pricing
  const [usdcBalance, setUsdcBalance] = useState('0');
  const [tokenBalance, setTokenBalance] = useState('0');
  const [tokensPerMessage, setTokensPerMessage] = useState<string | null>(null);
  const [rawTokensPerMessage, setRawTokensPerMessage] = useState<number>(0);
  const [balancesLoading, setBalancesLoading] = useState(true);
  const [pricingLoading, setPricingLoading] = useState(!!proxy.tokenAddress);
  const [swapSuccess, setSwapSuccess] = useState<{
    txHash: string;
    mode: 'buy' | 'sell';
    messages: number;
    usdcAmount: number;
  } | null>(null);

  // Fetch balances
  const refreshBalances = useCallback(async () => {
    if (!walletAddress) {
      setBalancesLoading(false);
      return;
    }
    setBalancesLoading(true);
    try {
      const [usdc, tok] = await Promise.all([
        getUsdcBalance(),
        proxy.tokenAddress ? getTokenBalance(proxy.tokenAddress) : Promise.resolve('0')
      ]);
      setUsdcBalance(usdc);
      setTokenBalance(tok);
    } finally {
      setBalancesLoading(false);
    }
  }, [walletAddress, getUsdcBalance, getTokenBalance, proxy.tokenAddress]);

  useEffect(() => {
    refreshBalances();
  }, [refreshBalances]);

  // Fetch how many tokens = 1 message (proxy's chat price in USDC)
  useEffect(() => {
    if (!proxy.tokenAddress) return;
    setPricingLoading(true);
    // Ask 0x: if I sell the chat-price worth of USDC, how many tokens do I get?
    getPrice(proxy.tokenAddress, '1', 'buy')
      .then((result) => {
        if (result) {
          const tokens = Number(result.buyAmount) / 1e18;
          setRawTokensPerMessage(tokens);
          setTokensPerMessage(tokens > 0 ? formatTokenAmount(tokens) : null);
        }
      })
      .finally(() => setPricingLoading(false));
  }, [proxy.tokenAddress, getPrice]);

  // Per-proxy chat price (creator-configured, falls back to global default)
  const msgPrice = proxy.chatPrice ?? MESSAGE_PRICE_USD;

  // Derive message count and USD cost from either denomination
  const rawAmount = parseFloat(amount) || 0;
  const msgCount = denomination === 'messages' ? rawAmount : rawAmount / msgPrice;
  const usdcCost = denomination === 'messages' ? rawAmount * msgPrice : rawAmount;

  const handleSwap = async () => {
    if (!proxy.tokenAddress || !amount || msgCount <= 0) return;
    if (tradeMode === 'buy' && msgCount < MIN_BUY_MESSAGES) return;
    setSwapSuccess(null);
    const savedMode = tradeMode;
    const savedMsgCount = Math.round(msgCount);
    const savedUsdcCost = usdcCost;
    // Always pass message count to the hook — it handles USDC conversion internally
    const txHash = await executeSwap(proxy.tokenAddress, String(savedMsgCount), tradeMode);
    if (txHash) {
      setSwapSuccess({
        txHash,
        mode: savedMode,
        messages: savedMsgCount,
        usdcAmount: savedUsdcCost
      });
      setAmount(denomination === 'messages' ? '5' : '0.50');
      refreshBalances();
    }
  };
  // Claim fees state
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimResult, setClaimResult] = useState<{
    success: boolean;
    txHash?: string;
    amount?: string;
    message?: string;
  } | null>(null);

  const handleClaimFees = async () => {
    if (!authenticated) {
      login();
      return;
    }
    setClaimLoading(true);
    setClaimResult(null);
    try {
      const res = await fetch('/api/claim-fees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: proxy.xHandle })
      });
      const data = await res.json();
      if (!res.ok) {
        setClaimResult({ success: false, message: data.error ?? 'Failed to claim fees' });
      } else if (data.claimed) {
        setClaimResult({ success: true, txHash: data.txHash, amount: data.amount });
      } else {
        setClaimResult({ success: true, message: data.message ?? 'No fees to claim' });
      }
    } catch {
      setClaimResult({ success: false, message: 'Failed to claim fees' });
    } finally {
      setClaimLoading(false);
    }
  };

  const [reviews, setReviews] = useState<ReviewItem[]>(initialReviews);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewScore, setReviewScore] = useState(0);
  const [hoverScore, setHoverScore] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const handleSubmitReview = async () => {
    if (!user?.id || reviewScore < 1) return;
    setSubmittingReview(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proxyHandle: proxy.xHandle,
          privyId: user.id,
          score: reviewScore,
          text: reviewText.trim() || undefined,
          userName: authDisplayName ?? undefined,
          userHandle: authXHandle ?? undefined,
          userAvatar: authAvatar ?? undefined
        })
      });
      if (res.ok) {
        // Refresh reviews
        const listRes = await fetch(`/api/reviews?handle=${encodeURIComponent(proxy.xHandle)}`);
        if (listRes.ok) {
          const data = await listRes.json();
          setReviews(data.reviews ?? []);
        }
        setShowReviewForm(false);
        setReviewScore(0);
        setReviewText('');
      }
    } catch {
      // silently fail
    } finally {
      setSubmittingReview(false);
    }
  };

  const handle = proxy.xHandle;
  const name = proxy.displayName ?? handle;
  const avatar = proxy.avatarUrl ?? DEFAULT_AVATAR;
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
                  <p className="text-white text-base font-medium">This proxy is unclaimed</p>
                  <p className="text-gray text-sm">
                    Are you @{handle}? Claim your proxy to earn royalties.
                  </p>
                </div>
              </div>
              <Link href={`/${handle}/claim`}>
                <Button size="sm" className="rounded-lg">
                  Claim Proxy
                </Button>
              </Link>
            </Card>
          )}

          {/* ─── Profile Header ─── */}
          <div className="flex gap-5 items-start">
            <img
              src={avatar}
              alt={name}
              width={120}
              height={120}
              className="rounded-2xl object-cover border-2 border-white/6 shrink-0"
            />

            <div className="space-y-2.5 min-w-0">
              {/* Name row */}
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-3xl font-bold text-white">{name}</h1>
                <BadgeCheck size={22} className="text-blue-400 shrink-0" />
                {proxy.status === 'live' && (
                  <Badge variant="lime" className="rounded-lg uppercase">
                    Live
                  </Badge>
                )}
              </div>

              {/* Bio */}
              <p className="text-gray text-base leading-relaxed">
                {proxy.bio ?? 'AI clone powered by Proxi. Chat with this digital twin.'}
              </p>

              {/* Rating row */}
              <div className="flex items-center gap-2 text-base text-gray">
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={20}
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
                    className="flex items-center gap-1.5 bg-white/6 border border-white/8 rounded-lg px-3.5 py-2 text-sm text-gray hover:text-white transition-colors cursor-pointer"
                  >
                    <span>CA: {truncateAddress(proxy.tokenAddress)}</span>
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

          {/* ─── Tabs ─── */}
          <div className="border-b border-white/6">
            <div className="flex gap-6">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    'pb-3 text-base font-medium border-b-2 transition-colors cursor-pointer',
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
              {/* Fee earnings banner */}
              {proxy.tokenAddress && (
                <Card className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <img
                        src={avatar}
                        alt={name}
                        width={48}
                        height={48}
                        className="rounded-xl object-cover shrink-0"
                      />
                      <div className="min-w-0 space-y-1">
                        <Badge className="bg-purple/15 text-purple border-purple/20">
                          <Gem size={14} className="fill-purple" /> Fee earnings
                        </Badge>
                        <p className="text-white text-xl font-bold">
                          {feeData && feeData.totalUsd > 0
                            ? formatFeeUsd(feeData.totalUsd)
                            : '$0.00'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Detailed breakdown + claim — only for the proxy owner */}
                  {authenticated && authXHandle?.toLowerCase() === proxy.xHandle.toLowerCase() && (
                    <>
                      {/* Claimed / Unclaimed breakdown */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white/4 rounded-xl px-4 py-3">
                          <p className="text-gray text-xs font-medium mb-0.5">Claimed</p>
                          <p className="text-white/70 text-base font-semibold">
                            {feeData ? `${parseFloat(feeData.claimed).toFixed(6)}` : '0.000000'}
                            <span className="text-gray text-xs ml-1">WETH</span>
                          </p>
                        </div>
                        <div className="bg-emerald-400/5 border border-emerald-400/10 rounded-xl px-4 py-3">
                          <p className="text-gray text-xs font-medium mb-0.5">Unclaimed</p>
                          <p className="text-emerald-400 text-base font-semibold">
                            {feeData ? `${parseFloat(feeData.unclaimed).toFixed(6)}` : '0.000000'}
                            <span className="text-emerald-400/60 text-xs ml-1">WETH</span>
                          </p>
                        </div>
                      </div>

                      {/* Claim result feedback */}
                      {claimResult && (
                        <div
                          className={cn(
                            'rounded-xl px-4 py-3 text-sm',
                            claimResult.success
                              ? 'bg-emerald-400/10 border border-emerald-400/20 text-emerald-400'
                              : 'bg-red-400/10 border border-red-400/20 text-red-400'
                          )}
                        >
                          {claimResult.success ? (
                            claimResult.txHash ? (
                              <div className="flex items-center gap-2">
                                <CheckCircle size={16} className="shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium">
                                    Claimed {parseFloat(claimResult.amount ?? '0').toFixed(6)} WETH
                                  </p>
                                  <a
                                    href={`https://basescan.org/tx/${claimResult.txHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-emerald-400/80 text-xs hover:underline flex items-center gap-1 mt-0.5"
                                  >
                                    View on Basescan <ExternalLink size={11} />
                                  </a>
                                </div>
                              </div>
                            ) : (
                              <p>{claimResult.message}</p>
                            )
                          ) : (
                            <p>{claimResult.message}</p>
                          )}
                        </div>
                      )}

                      {/* Claim button */}
                      {feeData && parseFloat(feeData.unclaimed) > 0 && (
                        <Button
                          className="w-full rounded-xl h-11 text-sm font-bold cursor-pointer gap-2"
                          onClick={handleClaimFees}
                          disabled={claimLoading}
                        >
                          {claimLoading ? (
                            <span className="flex items-center gap-2">
                              <Loader2 size={16} className="animate-spin" /> Claiming...
                            </span>
                          ) : (
                            <span className="flex items-center gap-2">
                              <Coins size={16} /> Claim {parseFloat(feeData.unclaimed).toFixed(6)} WETH
                            </span>
                          )}
                        </Button>
                      )}
                    </>
                  )}
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
                    <h3 className="text-white font-semibold text-base">Direct Message</h3>
                    <p className="text-gray text-sm mt-0.5 leading-relaxed">
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
                      <h3 className="text-white font-semibold text-base">View Brain</h3>
                      <p className="text-gray text-sm mt-0.5 leading-relaxed">
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

          {/* ─── Reviews Tab ─── */}
          {activeTab === 'Reviews' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-white font-semibold text-lg">Reviews</h3>
                  <div className="flex items-center gap-1">
                    <Star size={16} className="text-yellow-400 fill-yellow-400" />
                    <span className="text-white text-base font-medium">{rating.toFixed(1)}</span>
                  </div>
                  <span className="text-gray text-base">({reviews.length})</span>
                </div>
                {user && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 cursor-pointer"
                    onClick={() => setShowReviewForm(!showReviewForm)}
                  >
                    <Pencil size={12} /> Write a Review
                  </Button>
                )}
              </div>

              {/* Review form */}
              {showReviewForm && (
                <Card className="p-5 space-y-4 border-lime/20">
                  <p className="text-white text-base font-semibold">Rate your experience</p>

                  {/* Star selector */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onMouseEnter={() => setHoverScore(i + 1)}
                        onMouseLeave={() => setHoverScore(0)}
                        onClick={() => setReviewScore(i + 1)}
                        className="cursor-pointer p-0.5"
                      >
                        <Star
                          size={24}
                          className={cn(
                            'transition-colors',
                            i < (hoverScore || reviewScore)
                              ? 'text-yellow-400 fill-yellow-400'
                              : 'text-gray/30'
                          )}
                        />
                      </button>
                    ))}
                    {reviewScore > 0 && (
                      <span className="text-white text-sm ml-2 font-medium">{reviewScore}/5</span>
                    )}
                  </div>

                  {/* Text input */}
                  <textarea
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder="Share your experience (optional)..."
                    rows={3}
                    className="w-full bg-white/4 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-lime/30 transition-colors resize-none"
                  />

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      className="rounded-lg cursor-pointer"
                      disabled={reviewScore < 1 || submittingReview}
                      onClick={handleSubmitReview}
                    >
                      {submittingReview ? 'Submitting...' : 'Submit Review'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="cursor-pointer"
                      onClick={() => {
                        setShowReviewForm(false);
                        setReviewScore(0);
                        setReviewText('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </Card>
              )}

              {/* Review list */}
              {reviews.length === 0 ? (
                <Card className="text-center py-8">
                  <Star size={32} className="text-gray/30 mx-auto mb-2" />
                  <p className="text-gray text-base">No reviews yet</p>
                  <p className="text-gray/60 text-sm mt-1">Be the first to review this proxy</p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {reviews.map((review) => (
                    <Card key={review.id} className="p-4">
                      <div className="flex items-center gap-3">
                        {review.avatar ? (
                          <img
                            src={review.avatar}
                            alt={review.name}
                            width={40}
                            height={40}
                            className="rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold text-white shrink-0">
                            {review.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-white text-base font-semibold">
                              {review.name}
                            </span>
                            <span className="text-gray/50 text-sm">
                              {formatTimeAgo(review.createdAt)}
                            </span>
                          </div>
                          <div className="flex items-center gap-0.5 mt-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                size={14}
                                className={
                                  i < review.score
                                    ? 'text-yellow-400 fill-yellow-400'
                                    : 'text-gray/30'
                                }
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      {review.text && (
                        <p className="text-gray text-base leading-relaxed mt-3">{review.text}</p>
                      )}
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─── Market Tab ─── */}
          {activeTab === 'Market' &&
            (() => {
              const td = tokenData;
              const tokenPrice = td?.priceUsd ?? price;
              const tokenChange = td?.priceChange24h ?? priceChange;
              const tokenMcap = td?.marketCap ?? proxy.marketCap ?? 0;
              const tokenVol = td?.volume24h ?? proxy.volume24h ?? 0;
              const tokenLiq = td?.liquidity ?? 0;
              const history = td?.priceHistory ?? [];

              // Build SVG path from real price history
              const chartPath =
                history.length >= 2
                  ? (() => {
                      const prices = history.map((p) => p.price);
                      const minP = Math.min(...prices);
                      const maxP = Math.max(...prices);
                      const range = maxP - minP || 1;
                      const W = 600;
                      const H = 120;
                      const pad = 8;

                      return prices
                        .map((p, i) => {
                          const x = (i / (prices.length - 1)) * W;
                          const y = pad + ((maxP - p) / range) * (H - pad * 2);
                          return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
                        })
                        .join(' ');
                    })()
                  : null;

              return (
                <div className="space-y-4">
                  {/* Price hero */}
                  <Card className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      {td?.logo && (
                        <img src={td.logo} alt="" width={32} height={32} className="rounded-full" />
                      )}
                      <div>
                        <p className="text-white font-bold text-xl">
                          {td?.symbol ?? proxy.ticker ?? '—'}
                        </p>
                        <p className="text-gray text-sm">{td?.name ?? proxy.displayName}</p>
                      </div>
                    </div>
                    <div className="flex items-baseline gap-3">
                      <span className="text-white text-4xl font-bold">
                        {tokenPrice > 0 ? formatUsd(tokenPrice) : '—'}
                      </span>
                      {tokenChange !== 0 && (
                        <span
                          className={cn(
                            'text-sm font-medium',
                            tokenChange > 0 ? 'text-emerald-400' : 'text-red-400'
                          )}
                        >
                          {tokenChange > 0 ? '+' : ''}
                          {tokenChange.toFixed(2)}%
                        </span>
                      )}
                    </div>
                  </Card>

                  {/* Price chart */}
                  {chartPath && (
                    <Card className="p-4">
                      <p className="text-gray text-sm mb-2">30 Day Price</p>
                      <div className="relative h-[160px] w-full">
                        <svg
                          viewBox="0 0 600 120"
                          className="w-full h-full"
                          preserveAspectRatio="none"
                        >
                          <defs>
                            <linearGradient id="proxyPriceGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop
                                offset="0%"
                                stopColor={
                                  tokenChange >= 0 ? 'rgb(52,211,153)' : 'rgb(248,113,113)'
                                }
                                stopOpacity="0.15"
                              />
                              <stop
                                offset="100%"
                                stopColor={
                                  tokenChange >= 0 ? 'rgb(52,211,153)' : 'rgb(248,113,113)'
                                }
                                stopOpacity="0"
                              />
                            </linearGradient>
                          </defs>
                          <path d={`${chartPath} L600,120 L0,120 Z`} fill="url(#proxyPriceGrad)" />
                          <path
                            d={chartPath}
                            fill="none"
                            stroke={tokenChange >= 0 ? 'rgb(52,211,153)' : 'rgb(248,113,113)'}
                            strokeWidth="2"
                          />
                        </svg>
                      </div>
                    </Card>
                  )}

                  {/* Stats grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <Card>
                      <div className="flex items-center gap-1.5 mb-1">
                        <TrendingUp size={14} className="text-gray" />
                        <p className="text-gray text-sm">Market Cap</p>
                      </div>
                      <p className="text-white text-xl font-bold">
                        {tokenMcap > 0 ? formatCompact(tokenMcap) : '—'}
                      </p>
                    </Card>
                    <Card>
                      <div className="flex items-center gap-1.5 mb-1">
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          className="text-gray"
                        >
                          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                        </svg>
                        <p className="text-gray text-sm">24h Volume</p>
                      </div>
                      <p className="text-white text-xl font-bold">
                        {tokenVol > 0 ? formatCompact(tokenVol) : '—'}
                      </p>
                    </Card>
                    <Card>
                      <div className="flex items-center gap-1.5 mb-1">
                        <Droplets size={14} className="text-gray" />
                        <p className="text-gray text-sm">Liquidity</p>
                      </div>
                      <p className="text-white text-xl font-bold">
                        {tokenLiq > 0 ? formatCompact(tokenLiq) : '—'}
                      </p>
                    </Card>
                    <Card>
                      <div className="flex items-center gap-1.5 mb-1">
                        <MessageSquare size={14} className="text-gray" />
                        <p className="text-gray text-sm">Messages</p>
                      </div>
                      <p className="text-white text-xl font-bold">
                        {liveMessageCount.toLocaleString()}
                      </p>
                    </Card>
                  </div>

                  {/* Trade link */}
                  {td?.dexUrl && (
                    <a href={td.dexUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" className="w-full rounded-lg gap-2">
                        Trade on DEX <ExternalLink size={14} />
                      </Button>
                    </a>
                  )}
                </div>
              );
            })()}
        </div>

        {/* ============ Right Sidebar ============ */}
        <div className="hidden lg:flex flex-col gap-4 w-[340px] shrink-0">
          {/* ─── Buy/Sell Card ─── */}
          <Card className="space-y-4 p-5">
            {swapSuccess ? (
              /* ─── Success State ─── */
              <div className="flex flex-col items-center text-center py-2 space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-400/10 flex items-center justify-center">
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="rgb(52, 211, 153)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div>
                  <p className="text-white font-bold text-lg">
                    {swapSuccess.mode === 'buy' ? 'Purchase Complete!' : 'Sell Complete!'}
                  </p>
                  <p className="text-gray text-sm mt-1">
                    {swapSuccess.mode === 'buy'
                      ? `You bought ${swapSuccess.messages} message${swapSuccess.messages !== 1 ? 's' : ''}`
                      : `You sold ${swapSuccess.messages} message${swapSuccess.messages !== 1 ? 's' : ''}`}
                  </p>
                </div>

                <div className="w-full bg-white/4 rounded-xl px-4 py-3 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray">Messages</span>
                    <span className="text-white font-medium">{swapSuccess.messages}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray">
                      {swapSuccess.mode === 'buy' ? 'Cost' : 'Received'}
                    </span>
                    <span className="text-white font-medium">
                      {swapSuccess.mode === 'buy' ? '' : '~'}${swapSuccess.usdcAmount.toFixed(2)}{' '}
                      USDC
                    </span>
                  </div>
                </div>

                <a
                  href={`https://basescan.org/tx/${swapSuccess.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-lime text-sm hover:underline flex items-center gap-1.5"
                >
                  View on Basescan <ExternalLink size={13} />
                </a>

                <Button
                  className="w-full rounded-xl h-11 text-sm font-bold cursor-pointer"
                  onClick={() => setSwapSuccess(null)}
                >
                  {swapSuccess.mode === 'buy' ? 'Buy More' : 'Done'}
                </Button>
              </div>
            ) : (
              /* ─── Trade Form ─── */
              <>
                {/* Buy/Sell toggle */}
                <div className="flex bg-white/6 rounded-xl p-1">
                  <button
                    onClick={() => {
                      setTradeMode('buy');
                      setAmount(denomination === 'messages' ? '5' : '0.50');
                    }}
                    className={cn(
                      'flex-1 py-2 text-sm font-semibold rounded-[10px] transition-colors cursor-pointer',
                      tradeMode === 'buy' ? 'bg-white/12 text-white' : 'text-gray hover:text-white'
                    )}
                  >
                    Buy
                  </button>
                  <button
                    onClick={() => {
                      setTradeMode('sell');
                      setAmount(denomination === 'messages' ? '5' : '0.50');
                    }}
                    className={cn(
                      'flex-1 py-2 text-sm font-semibold rounded-[10px] transition-colors cursor-pointer',
                      tradeMode === 'sell' ? 'bg-white/12 text-white' : 'text-gray hover:text-white'
                    )}
                  >
                    Sell
                  </button>
                </div>

                {/* Message pricing info */}
                <div className="bg-white/4 rounded-xl px-4 py-3 space-y-1">
                  {pricingLoading ? (
                    <div className="h-5 w-48 bg-white/6 rounded animate-pulse" />
                  ) : tokensPerMessage ? (
                    <p className="text-white text-sm font-medium">
                      {tokensPerMessage} tokens <span className="text-gray">(${msgPrice.toFixed(2)})</span> = 1
                      message
                    </p>
                  ) : null}
                  <div className="flex items-baseline gap-2.5">
                    <span className="text-white text-2xl font-bold leading-tight">
                      {formatUsd(tokenData?.priceUsd ?? price)}
                    </span>
                    {(() => {
                      const change = tokenData?.priceChange24h ?? priceChange;
                      return (
                        <span
                          className={cn(
                            'text-xs font-medium',
                            change >= 0 ? 'text-emerald-400' : 'text-red-400'
                          )}
                        >
                          {change >= 0 ? '+' : ''}
                          {change.toFixed(2)}%
                        </span>
                      );
                    })()}
                  </div>
                  <p className="text-gray text-[11px]">per token</p>
                </div>

                {/* Amount input */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-gray text-xs font-medium">
                      {denomination === 'messages'
                        ? tradeMode === 'buy'
                          ? 'Messages to buy'
                          : 'Messages to sell'
                        : tradeMode === 'buy'
                          ? 'Amount to spend'
                          : 'Amount to receive'}
                    </label>
                    {/* Denomination toggle */}
                    <button
                      onClick={() => {
                        if (denomination === 'messages') {
                          // Convert current messages to USD
                          const usd = rawAmount * msgPrice;
                          setAmount(usd > 0 ? usd.toFixed(2) : '1');
                          setDenomination('usd');
                        } else {
                          // Convert current USD to messages
                          const msgs = Math.round(rawAmount / msgPrice);
                          setAmount(msgs > 0 ? String(msgs) : '5');
                          setDenomination('messages');
                        }
                      }}
                      className="flex items-center gap-1 text-[11px] text-lime/80 hover:text-lime transition-colors cursor-pointer"
                    >
                      <ArrowLeftRight size={11} />
                      {denomination === 'messages' ? 'Switch to USD' : 'Switch to Messages'}
                    </button>
                  </div>
                  <div className="flex items-center gap-2 bg-white/4 border border-white/10 rounded-xl px-4 py-3">
                    {denomination === 'usd' && (
                      <DollarSign size={14} className="text-gray shrink-0" />
                    )}
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="flex-1 min-w-0 bg-transparent text-white text-sm font-medium outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="0"
                      min={denomination === 'messages' ? '1' : '0.10'}
                      step={denomination === 'messages' ? '1' : '0.10'}
                    />
                    <span className="text-gray text-xs shrink-0">
                      {denomination === 'messages' ? 'msgs' : 'USD'}
                    </span>
                  </div>

                  {/* Conversion info */}
                  {rawAmount > 0 && (
                    <p className="text-gray text-xs">
                      {denomination === 'messages' ? (
                        tradeMode === 'buy' ? (
                          <>
                            Cost:{' '}
                            <span className="text-white font-medium">
                              ${usdcCost.toFixed(2)} USDC
                            </span>
                          </>
                        ) : (
                          <>
                            You receive:{' '}
                            <span className="text-white font-medium">
                              ~${usdcCost.toFixed(2)} USDC
                            </span>
                          </>
                        )
                      ) : tradeMode === 'buy' ? (
                        <>
                          ={' '}
                          <span className="text-white font-medium">
                            {Math.round(msgCount)} messages
                          </span>
                        </>
                      ) : (
                        <>
                          ={' '}
                          <span className="text-white font-medium">
                            {Math.round(msgCount)} messages
                          </span>{' '}
                          to sell
                        </>
                      )}
                    </p>
                  )}
                </div>

                {/* Quick amount buttons */}
                <div className="flex gap-2">
                  {denomination === 'messages'
                    ? ['10', '50', '100'].map((label) => (
                        <button
                          key={label}
                          onClick={() => setAmount(label)}
                          className={cn(
                            'flex-1 py-2 text-xs font-medium border rounded-xl transition-colors cursor-pointer',
                            amount === label
                              ? 'border-lime/40 text-lime bg-lime/5'
                              : 'border-white/10 text-gray hover:text-white hover:border-white/20'
                          )}
                        >
                          {label} msgs
                        </button>
                      ))
                    : ['1', '5', '10'].map((label) => (
                        <button
                          key={label}
                          onClick={() => setAmount(label)}
                          className={cn(
                            'flex-1 py-2 text-xs font-medium border rounded-xl transition-colors cursor-pointer',
                            amount === label
                              ? 'border-lime/40 text-lime bg-lime/5'
                              : 'border-white/10 text-gray hover:text-white hover:border-white/20'
                          )}
                        >
                          ${label}
                        </button>
                      ))}
                </div>

                {/* Balance */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray">USDC Balance</span>
                    {balancesLoading ? (
                      <div className="h-3.5 w-16 bg-white/6 rounded animate-pulse" />
                    ) : (
                      <span className="text-white font-medium">
                        ${parseFloat(usdcBalance).toFixed(2)}
                      </span>
                    )}
                  </div>
                  {proxy.tokenAddress && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray">Messages owned</span>
                      {balancesLoading || pricingLoading ? (
                        <div className="h-3.5 w-20 bg-white/6 rounded animate-pulse" />
                      ) : (
                        <span className="text-white font-medium">
                          {rawTokensPerMessage > 0
                            ? Math.floor(parseFloat(tokenBalance) / rawTokensPerMessage).toLocaleString()
                            : '0'} msgs
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Error */}
                {swapError && (
                  <p className="text-red-400 text-xs bg-red-400/10 rounded-xl px-3 py-2">
                    {swapError}
                  </p>
                )}

                {/* CTA button */}
                {!authenticated ? (
                  <Button
                    className="w-full rounded-xl h-11 text-sm font-bold cursor-pointer"
                    onClick={login}
                  >
                    Connect Wallet
                  </Button>
                ) : !proxy.tokenAddress ? (
                  <Button className="w-full rounded-xl h-11 text-sm font-bold" disabled>
                    Token not deployed
                  </Button>
                ) : (
                  <>
                    {tradeMode === 'buy' && msgCount > 0 && msgCount < MIN_BUY_MESSAGES && (
                      <p className="text-yellow-400 text-xs text-center mb-1">
                        Minimum purchase is {MIN_BUY_MESSAGES} messages
                      </p>
                    )}
                    <Button
                      className="w-full rounded-xl h-11 text-sm font-bold cursor-pointer"
                      onClick={handleSwap}
                      disabled={
                        swapLoading ||
                        !amount ||
                        msgCount <= 0 ||
                        (tradeMode === 'buy' && msgCount < MIN_BUY_MESSAGES)
                      }
                    >
                      {swapLoading ? (
                        <span className="flex items-center gap-2">
                          <Loader2 size={16} className="animate-spin" /> Processing...
                        </span>
                      ) : tradeMode === 'buy' ? (
                        `Buy ${Math.round(msgCount)} Messages — $${usdcCost.toFixed(2)}`
                      ) : (
                        `Sell ${Math.round(msgCount)} Messages`
                      )}
                    </Button>
                  </>
                )}

                <p className="text-gray/40 text-[11px] text-center flex items-center justify-center gap-1.5">
                  <Info size={10} /> ${msgPrice.toFixed(2)}/msg &middot; {parseInt(SWAP_FEE_BPS) / 100}% fee &middot; {parseInt(SLIPPAGE_BPS) / 100}% slippage
                </p>
              </>
            )}
          </Card>

          {/* ─── Your Position ─── */}
          <Card className="space-y-3">
            <h3 className="text-white font-semibold text-base">Your position</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray text-sm">Messages owned</span>
                {balancesLoading || pricingLoading ? (
                  <div className="h-4 w-16 bg-white/6 rounded animate-pulse" />
                ) : (
                  <span className="text-white text-base font-medium">
                    {rawTokensPerMessage > 0
                      ? Math.floor(parseFloat(tokenBalance) / rawTokensPerMessage).toLocaleString()
                      : '0'}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray text-sm">Market value</span>
                {balancesLoading ? (
                  <div className="h-4 w-14 bg-white/6 rounded animate-pulse" />
                ) : (
                  <span className="text-white text-base font-medium">
                    ${(parseFloat(tokenBalance) * price).toFixed(2)}
                  </span>
                )}
              </div>
            </div>
          </Card>

          {/* ─── Reviews ─── */}
          <Card className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-white font-semibold text-base">Reviews</h3>
              <div className="flex items-center gap-1">
                <Star size={14} className="text-yellow-400 fill-yellow-400" />
                <span className="text-white text-sm font-medium">{rating.toFixed(1)}</span>
              </div>
            </div>

            {/* Review preview (top 3) */}
            {reviews.length === 0 ? (
              <p className="text-gray text-sm">No reviews yet</p>
            ) : (
              <div className="space-y-3">
                {reviews.slice(0, 3).map((review) => (
                  <div
                    key={review.id}
                    className="border-t border-white/6 pt-3 first:border-0 first:pt-0"
                  >
                    <div className="flex items-center gap-2.5">
                      {review.avatar ? (
                        <img
                          src={review.avatar}
                          alt={review.name}
                          width={32}
                          height={32}
                          className="rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white">
                          {review.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-white text-sm font-semibold">{review.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                size={11}
                                className={
                                  i < review.score
                                    ? 'text-yellow-400 fill-yellow-400'
                                    : 'text-gray/30'
                                }
                              />
                            ))}
                          </div>
                          <span className="text-gray/50 text-xs">
                            &middot; {formatTimeAgo(review.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                    {review.text && (
                      <p className="text-gray text-sm leading-relaxed mt-1.5 ml-[42px]">
                        {review.text}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              className="w-full cursor-pointer"
              onClick={() => setActiveTab('Reviews')}
            >
              {reviews.length > 0 ? `Show all ${reviews.length} reviews` : 'View reviews'}
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ─── Formatting helpers ─── */

/** Format a token amount to be human-readable (e.g. 1.5M, 42.3K, 0.00034) */
function formatTokenAmount(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(2)}K`;
  if (n >= 1) return n.toFixed(2);
  if (n >= 0.01) return n.toFixed(4);
  // Very small numbers — show significant digits
  const s = n.toFixed(18);
  const match = s.match(/^0\.(0*?)([1-9]\d{0,3})/);
  if (match) {
    const zeros = match[1].length;
    const digits = match[2];
    return `0.0\u0336${zeros > 0 ? String(zeros) : ''}${digits}`;
  }
  return n.toPrecision(4);
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function formatUsd(value: number): string {
  if (value >= 1) return `$${value.toFixed(2)}`;
  if (value >= 0.01) return `$${value.toFixed(4)}`;
  // For very small prices, show significant digits
  return `$${value.toFixed(8).replace(/0+$/, '')}`;
}

function formatCompact(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(2)}`;
}

function formatFeeUsd(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;
  if (value >= 1) return `$${value.toFixed(2)}`;
  if (value >= 0.01) return `$${value.toFixed(2)}`;
  return `$${value.toFixed(4)}`;
}
