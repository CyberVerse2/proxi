'use client';

import { PrivyProvider, usePrivy } from '@privy-io/react-auth';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { base } from 'viem/chains';

/** Redirect to dashboard when user completes login/signup */
function LoginRedirect({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { ready, authenticated } = usePrivy();
  const wasAuthenticated = useRef(false);

  useEffect(() => {
    if (!ready) return;
    if (authenticated && !wasAuthenticated.current) {
      wasAuthenticated.current = true;
      if (pathname !== '/dashboard') {
        router.replace('/dashboard');
      }
    }
    if (!authenticated) wasAuthenticated.current = false;
  }, [ready, authenticated, pathname, router]);

  return <>{children}</>;
}

function PrivyWrapper({ children }: { children: React.ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  if (!appId) return <>{children}</>;
  return (
    <PrivyProvider
      appId={appId}
      config={{
        appearance: { theme: 'dark', accentColor: '#BFFF00' },
        loginMethods: ['twitter'],
        defaultChain: base,
        supportedChains: [base],
        embeddedWallets: { ethereum: { createOnLogin: 'users-without-wallets' } }
      }}
    >
      <LoginRedirect>{children}</LoginRedirect>
    </PrivyProvider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <PrivyWrapper>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </PrivyWrapper>
  );
}
