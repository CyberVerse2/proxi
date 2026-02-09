"use client";

import { useAuth } from "@/hooks/use-auth";
import Image from "next/image";
import Link from "next/link";

interface ClaimClientProps {
  handle: string;
  proxyId: string;
  displayName: string;
  avatarUrl?: string;
  tokenAddress?: string;
  ticker?: string;
}

export function ClaimClient({
  handle,
  displayName,
  avatarUrl,
  tokenAddress,
  ticker,
}: ClaimClientProps) {
  const { ready, authenticated, xHandle, walletAddress, login } = useAuth();

  const isOwner =
    authenticated &&
    xHandle?.toLowerCase() === handle.toLowerCase();

  const baseScanUrl = tokenAddress
    ? `https://basescan.org/token/${tokenAddress}`
    : null;

  const dexScreenerUrl = tokenAddress
    ? `https://dexscreener.com/base/${tokenAddress}`
    : null;

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="flex flex-col items-center text-center space-y-3">
          {avatarUrl && (
            <Image
              src={avatarUrl}
              alt={displayName}
              width={80}
              height={80}
              className="rounded-full border-2 border-white/10"
            />
          )}
          <h1 className="text-2xl font-bold">{displayName}</h1>
          <p className="text-gray-400 text-sm">@{handle}</p>
        </div>

        {/* Token info */}
        {tokenAddress ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Token</span>
              <span className="font-semibold text-lime-400">
                ${ticker ?? "???"}
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Contract</span>
                <a
                  href={baseScanUrl!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline font-mono text-xs"
                >
                  {tokenAddress.slice(0, 6)}...{tokenAddress.slice(-4)}
                </a>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Chain</span>
                <span>Base</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">LP Fee Split</span>
                <span>50% creator / 50% platform</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Vault</span>
                <span>30% locked for 6 months</span>
              </div>
            </div>

            {dexScreenerUrl && (
              <a
                href={dexScreenerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center py-2.5 rounded-xl bg-white/10 hover:bg-white/15 transition-colors text-sm font-medium"
              >
                View on DexScreener
              </a>
            )}
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center text-gray-400 text-sm">
            No token has been deployed for this proxy yet.
          </div>
        )}

        {/* Auth section */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
          <h2 className="text-lg font-semibold">Claim Your Creator Fees</h2>

          {!ready ? (
            <div className="text-center py-4 text-gray-500 text-sm">
              Loading...
            </div>
          ) : !authenticated ? (
            <>
              <p className="text-sm text-gray-400">
                Sign in with your X account to verify you are the creator and
                access your wallet with accumulated LP fees.
              </p>
              <button
                onClick={login}
                className="w-full py-3 rounded-xl bg-[#BFFF00] text-black font-semibold hover:bg-[#a8e600] transition-colors"
              >
                Sign in with X
              </button>
            </>
          ) : !isOwner ? (
            <div className="text-center py-4 space-y-2">
              <p className="text-red-400 text-sm">
                You are signed in as <strong>@{xHandle}</strong>, but this
                proxy belongs to <strong>@{handle}</strong>.
              </p>
              <p className="text-gray-500 text-xs">
                Please sign in with the correct X account.
              </p>
              <button
                onClick={login}
                className="mt-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 transition-colors text-sm"
              >
                Switch Account
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 rounded-xl bg-lime-400/10 border border-lime-400/20 px-4 py-3 text-sm text-lime-400">
                <span>&#10003;</span>
                <span>Verified as @{xHandle}</span>
              </div>

              {walletAddress && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Your Wallet</span>
                    <a
                      href={`https://basescan.org/address/${walletAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline font-mono text-xs"
                    >
                      {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                    </a>
                  </div>
                  <p className="text-xs text-gray-500">
                    This wallet was created for you when your proxy was built.
                    LP fees from your token are automatically deposited here.
                  </p>
                </div>
              )}

              <Link
                href={`/${handle}/chat`}
                className="block w-full text-center py-2.5 rounded-xl bg-white/10 hover:bg-white/15 transition-colors text-sm font-medium"
              >
                Chat with your proxy
              </Link>
            </div>
          )}
        </div>

        {/* Back link */}
        <div className="text-center">
          <Link
            href={`/${handle}`}
            className="text-sm text-gray-500 hover:text-white transition-colors"
          >
            View proxy profile
          </Link>
        </div>
      </div>
    </div>
  );
}
