'use client';

import { useState } from 'react';

export function useProxyClaim({
  authenticated,
  login,
  handle,
  getAccessToken
}: {
  authenticated: boolean;
  login: () => void;
  handle: string;
  getAccessToken: (() => Promise<string | null>) | null;
}) {
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
      const authToken = await getAccessToken?.();
      if (!authToken) {
        setClaimResult({ success: false, message: 'Sign in again to claim creator earnings' });
        return;
      }

      const res = await fetch('/api/claim-fees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ handle })
      });
      const data = await res.json();
      if (!res.ok) {
        setClaimResult({ success: false, message: data.error ?? 'Failed to claim creator earnings' });
      } else if (data.claimed) {
        setClaimResult({ success: true, txHash: data.txHash, amount: data.amount });
      } else {
        setClaimResult({ success: true, message: data.message ?? 'No creator earnings to claim' });
      }
    } catch {
      setClaimResult({ success: false, message: 'Failed to claim creator earnings' });
    } finally {
      setClaimLoading(false);
    }
  };

  return {
    claimLoading,
    claimResult,
    handleClaimFees
  };
}
