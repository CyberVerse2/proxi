'use client';

import Image from 'next/image';
import Link from 'next/link';
import { LOW_MESSAGE_THRESHOLD } from '@/lib/config/constants';

interface CreditsData {
  freeRemaining: number;
  freeLimit: number;
  hasTokens: boolean;
  messagesOwned: number;
  unlimited: boolean;
}

export function ChatHeader({
  avatar,
  name,
  bio,
  credits,
  handle
}: {
  avatar: string;
  name: string;
  bio: string | null;
  credits: CreditsData | null;
  handle: string;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center px-4 pt-4 pb-2 text-center shrink-0 "
      style={{ position: 'sticky', top: 0, zIndex: 15 }}
    >
      <Image
        src={avatar}
        alt={name}
        width={64}
        height={64}
        className="rounded-full object-cover border border-white/10 shadow-sm"
        style={{ minWidth: 52, minHeight: 52 }}
      />
      <h1 className="text-white font-semibold text-lg mt-2">{name}</h1>
      {bio && (
        <p className="text-white/60 text-sm mt-1 max-w-[380px] mx-auto line-clamp-1">{bio}</p>
      )}
      {credits &&
        !credits.unlimited &&
        (() => {
          if (credits.hasTokens) {
            const isLow = credits.messagesOwned < LOW_MESSAGE_THRESHOLD;
            return (
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-xs ${isLow ? 'text-yellow-400/60' : 'text-white/40'}`}>
                  {credits.messagesOwned.toLocaleString()} message
                  {credits.messagesOwned !== 1 ? 's' : ''} remaining
                </span>
                {isLow && (
                  <Link
                    href={`/${handle}#trade`}
                    className="text-[11px] font-semibold text-black bg-lime rounded-full px-2.5 py-0.5 hover:bg-lime/90 transition-colors"
                  >
                    Buy
                  </Link>
                )}
              </div>
            );
          }

          if (credits.freeRemaining > 0) {
            return (
              <div className="flex items-center gap-2 mt-2">
                <span className="text-white/30 text-xs">
                  {credits.freeRemaining} free message{credits.freeRemaining !== 1 ? 's' : ''}{' '}
                  remaining
                </span>
                <Link
                  href={`/${handle}#trade`}
                  className="text-[11px] font-semibold text-black bg-lime rounded-full px-2.5 py-0.5 hover:bg-lime/90 transition-colors"
                >
                  Buy
                </Link>
              </div>
            );
          }

          return (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-yellow-400/60 text-xs">0 messages remaining</span>
              <Link
                href={`/${handle}#trade`}
                className="text-[11px] font-semibold text-black bg-lime rounded-full px-2.5 py-0.5 hover:bg-lime/90 transition-colors"
              >
                Buy
              </Link>
            </div>
          );
        })()}
    </div>
  );
}
