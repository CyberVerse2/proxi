'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

export function useAuth() {
  const router = useRouter();
  let ready = false,
    authenticated = false;
  let user: ReturnType<typeof usePrivy>['user'] | null = null;
  let privyLogin: (() => void) | null = null;
  let privyLogout: (() => Promise<void>) | null = null;
  let getAccessToken: (() => Promise<string | null>) | null = null;

  try {
    const privy = usePrivy();
    ready = privy.ready;
    authenticated = privy.authenticated;
    user = privy.user;
    privyLogin = privy.login;
    privyLogout = privy.logout;
    getAccessToken = privy.getAccessToken;
  } catch {
    /* Privy not configured */
  }

  const login = useCallback(() => {
    privyLogin?.();
  }, [privyLogin]);
  const logout = useCallback(async () => {
    await privyLogout?.();
    router.push('/');
  }, [privyLogout, router]);

  return {
    ready,
    authenticated,
    user,
    xHandle: user?.twitter?.username ?? null,
    xProfileImageUrl: user?.twitter?.profilePictureUrl ?? null,
    walletAddress: user?.wallet?.address ?? null,
    login,
    logout,
    getAccessToken
  };
}
