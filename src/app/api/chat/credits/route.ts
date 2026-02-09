import { NextRequest, NextResponse } from 'next/server';
import { getProxyByHandle, getUserByPrivyId, getUserProxyMessageCount } from '@/lib/db/queries';
import { getOnChainTokenBalance, getTokensPerMessage } from '@/lib/chain/token';
import { getPrivyWalletAddress } from '@/lib/auth/privy';
import { formatUnits } from 'viem';
import { FREE_MESSAGES_PER_PROXY, MESSAGE_PRICE_USD } from '@/lib/config/constants';

/**
 * GET /api/chat/credits?proxyHandle=X&privyId=Y
 *
 * Returns the user's remaining free messages for a proxy,
 * whether they hold tokens, and how many messages their tokens cover.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const proxyHandle = searchParams.get('proxyHandle');
  const privyId = searchParams.get('privyId');

  if (!proxyHandle) {
    return NextResponse.json({ error: 'Missing proxyHandle' }, { status: 400 });
  }

  const proxy = await getProxyByHandle(proxyHandle);
  if (!proxy) {
    return NextResponse.json({ error: 'Proxy not found' }, { status: 404 });
  }

  // Per-proxy message price (creator-configured, falls back to global default)
  const messagePriceUsd = proxy.chatPrice ?? MESSAGE_PRICE_USD;

  // If no token on this proxy, chat is unlimited
  if (!proxy.tokenAddress) {
    return NextResponse.json({
      freeRemaining: FREE_MESSAGES_PER_PROXY,
      freeLimit: FREE_MESSAGES_PER_PROXY,
      freeUsed: 0,
      hasTokens: true,
      messagesOwned: 0,
      unlimited: true,
      messagePriceUsd
    });
  }

  // If user isn't authenticated, return full free allowance
  if (!privyId) {
    return NextResponse.json({
      freeRemaining: FREE_MESSAGES_PER_PROXY,
      freeLimit: FREE_MESSAGES_PER_PROXY,
      freeUsed: 0,
      hasTokens: false,
      messagesOwned: 0,
      unlimited: false,
      messagePriceUsd
    });
  }

  const user = await getUserByPrivyId(privyId);
  if (!user) {
    return NextResponse.json({
      freeRemaining: FREE_MESSAGES_PER_PROXY,
      freeLimit: FREE_MESSAGES_PER_PROXY,
      freeUsed: 0,
      hasTokens: false,
      messagesOwned: 0,
      unlimited: false,
      messagePriceUsd
    });
  }

  const msgCount = await getUserProxyMessageCount(user.id, proxy.id);
  const freeRemaining = Math.max(0, FREE_MESSAGES_PER_PROXY - msgCount);

  // Resolve wallet address from Privy (source of truth)
  const walletAddress = await getPrivyWalletAddress(privyId);

  // Check token balance and compute messages owned
  let hasTokens = false;
  let messagesOwned = 0;
  if (walletAddress) {
    try {
      const [balance, tokensPerMsg] = await Promise.all([
        getOnChainTokenBalance(proxy.tokenAddress as `0x${string}`, walletAddress as `0x${string}`),
        getTokensPerMessage(proxy.tokenAddress, messagePriceUsd)
      ]);
      hasTokens = balance > 0n;
      if (tokensPerMsg > 0) {
        const tokenBalanceNum = parseFloat(formatUnits(balance, 18));
        messagesOwned = Math.floor(tokenBalanceNum / tokensPerMsg);
      }
    } catch {
      // If balance check fails, assume no tokens
    }
  }

  return NextResponse.json({
    freeRemaining,
    freeLimit: FREE_MESSAGES_PER_PROXY,
    freeUsed: msgCount,
    hasTokens,
    messagesOwned,
    unlimited: false,
    messagePriceUsd
  });
}
