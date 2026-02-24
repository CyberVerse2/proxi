'use client';

import { useCallback, useEffect, useState } from 'react';

interface CreditsData {
  freeRemaining: number;
  freeLimit: number;
  hasTokens: boolean;
  messagesOwned: number;
  unlimited: boolean;
}

export function useChatCredits(
  handle: string,
  privyId: string | undefined,
  messageCount: number,
  setPaymentRequired: (value: 'insufficient_tokens' | 'wallet_required' | 'payment_failed' | null) => void
) {
  const [credits, setCredits] = useState<CreditsData | null>(null);

  const fetchCredits = useCallback(() => {
    const params = new URLSearchParams({ proxyHandle: handle });
    if (privyId) params.set('privyId', privyId);
    fetch(`/api/chat/credits?${params}`)
      .then((response) => response.json())
      .then((data: CreditsData) => {
        setCredits(data);
        // Clear payment block if user now has tokens or free messages
        if (data.hasTokens || data.freeRemaining > 0 || data.unlimited) {
          setPaymentRequired(null);
        }
      })
      .catch(() => {});
  }, [handle, privyId, setPaymentRequired]);

  useEffect(() => {
    fetchCredits();
  }, [fetchCredits, messageCount]);

  // Re-check credits when user returns to the tab (e.g. after buying tokens)
  useEffect(() => {
    const onFocus = () => fetchCredits();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [fetchCredits]);

  return { credits, refreshCredits: fetchCredits };
}
