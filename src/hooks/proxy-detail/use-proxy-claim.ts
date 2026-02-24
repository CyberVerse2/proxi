'use client';

import { useState } from 'react';

export function useProxyClaim({
  authenticated,
  login,
  handle
}: {
  authenticated: boolean;
  login: () => void;
  handle: string;
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
      const res = await fetch('/api/claim-fees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle })
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

  return {
    claimLoading,
    claimResult,
    handleClaimFees
  };
}
