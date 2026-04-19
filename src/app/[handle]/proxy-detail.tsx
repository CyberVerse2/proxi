'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { DEFAULT_AVATAR } from '@/lib/config/constants';
import type { TokenMarketData } from '@/lib/chain/token';
import { ProxyAboutTab } from '@/components/proxy/proxy-about-tab';
import { ProxyDetailHeader } from '@/components/proxy/proxy-detail-header';
import { ProxyMarketTab } from '@/components/proxy/proxy-market-tab';
import { ProxyReviewsTab } from '@/components/proxy/proxy-reviews-tab';
import { ProxyTradeSidebar } from '@/components/proxy/proxy-trade-sidebar';
import { useProxyClaim } from '@/hooks/proxy-detail/use-proxy-claim';
import { useProxyReviews } from '@/hooks/proxy-detail/use-proxy-reviews';
import { useProxyTrade } from '@/hooks/proxy-detail/use-proxy-trade';

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
  const [copied, setCopied] = useState(false);

  // Auth + Swap
  const {
    user,
    walletAddress,
    login,
    authenticated,
    xHandle: authXHandle,
    xDisplayName: authDisplayName,
    xProfileImageUrl: authAvatar,
    getAccessToken
  } = useAuth();

  const trade = useProxyTrade({
    walletAddress,
    tokenAddress: proxy.tokenAddress,
    chatPrice: proxy.chatPrice
  });
  const claim = useProxyClaim({
    authenticated,
    login,
    handle: proxy.xHandle,
    getAccessToken
  });
  const reviewsState = useProxyReviews({
    initialReviews,
    proxyHandle: proxy.xHandle,
    userId: user?.id,
    authDisplayName,
    authXHandle,
    authAvatar
  });

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

  const marketValue =
    trade.rawTokensPerMessage > 0
      ? trade.messagesOwned * trade.msgPrice
      : parseFloat(trade.tokenBalance) * price;

  return (
    <div className="max-w-[1100px] mx-auto px-6 pb-20">
      <div className="flex gap-8">
        {/* ============ Left Column ============ */}
        <div className="flex-1 min-w-0 space-y-6">
          <ProxyDetailHeader
            creatorId={proxy.creatorId}
            handle={handle}
            avatar={avatar}
            name={name}
            status={proxy.status}
            bio={proxy.bio}
            rating={rating}
            totalChats={proxy.totalChats}
            tokenAddress={proxy.tokenAddress}
            copied={copied}
            onCopyTokenAddress={copyCA}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />

          {activeTab === 'About Me' && (
            <ProxyAboutTab
              proxy={proxy}
              avatar={avatar}
              name={name}
              handle={handle}
              feeData={feeData}
              authenticated={authenticated}
              authXHandle={authXHandle}
              claimResult={claim.claimResult}
              claimLoading={claim.claimLoading}
              onClaimFees={claim.handleClaimFees}
            />
          )}

          {activeTab === 'Reviews' && (
            <ProxyReviewsTab
              rating={rating}
              reviews={reviewsState.reviews}
              canReview={!!user}
              showReviewForm={reviewsState.showReviewForm}
              onToggleReviewForm={() => reviewsState.setShowReviewForm(!reviewsState.showReviewForm)}
              reviewScore={reviewsState.reviewScore}
              hoverScore={reviewsState.hoverScore}
              reviewText={reviewsState.reviewText}
              submittingReview={reviewsState.submittingReview}
              setHoverScore={reviewsState.setHoverScore}
              setReviewScore={reviewsState.setReviewScore}
              setReviewText={reviewsState.setReviewText}
              onSubmitReview={reviewsState.handleSubmitReview}
              onCancelReview={reviewsState.resetReviewForm}
            />
          )}

          {activeTab === 'Market' && (
            <ProxyMarketTab
              tokenData={tokenData}
              fallbackPrice={price}
              fallbackPriceChange={priceChange}
              fallbackMarketCap={proxy.marketCap ?? 0}
              fallbackVolume24h={proxy.volume24h ?? 0}
              fallbackDisplayName={proxy.displayName}
              fallbackTicker={proxy.ticker}
              liveMessageCount={liveMessageCount}
            />
          )}
        </div>

        <ProxyTradeSidebar
          swapSuccess={trade.swapSuccess}
          onClearSwapSuccess={() => trade.setSwapSuccess(null)}
          tradeMode={trade.tradeMode}
          setTradeMode={trade.setTradeMode}
          denomination={trade.denomination}
          setDenomination={trade.setDenomination}
          amount={trade.amount}
          setAmount={trade.setAmount}
          msgPrice={trade.msgPrice}
          pricingLoading={trade.pricingLoading}
          tokensPerMessage={trade.tokensPerMessage}
          tokenPrice={tokenData?.priceUsd ?? price}
          tokenChange={tokenData?.priceChange24h ?? priceChange}
          rawAmount={trade.rawAmount}
          usdcCost={trade.usdcCost}
          msgCount={trade.msgCount}
          balancesLoading={trade.balancesLoading}
          usdcBalance={trade.usdcBalance}
          hasTokenAddress={!!proxy.tokenAddress}
          rawTokensPerMessage={trade.rawTokensPerMessage}
          tokenBalance={trade.tokenBalance}
          swapError={trade.swapError}
          authenticated={authenticated}
          onLogin={login}
          swapLoading={trade.swapLoading}
          onSwap={trade.handleSwap}
          marketValue={marketValue}
          onViewAllReviews={() => setActiveTab('Reviews')}
        />
      </div>
    </div>
  );
}
