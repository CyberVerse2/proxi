'use client';

import Link from 'next/link';
import { BadgeCheck, Star } from 'lucide-react';
import type { Proxy } from '@/lib/db/schema';
import Image from 'next/image';

interface ProxyCardProps {
  proxy: Proxy;
}

export function ProxyCard({ proxy }: ProxyCardProps) {
  const imgSrc = proxy.avatarUrl || '/mock-avatar.jpg';
  const price = proxy.price?.toFixed(2) ?? '0.00';
  const change = proxy.priceChange24h?.toFixed(1) ?? '0.0';
  const isNegative = (proxy.priceChange24h ?? 0) < 0;

  return (
    <Link
      href={`/${proxy.xHandle}`}
      className={`
        group no-underline shrink-0 w-[260px] relative 
        rounded-3xl border-2 border-transparent
        transition-all duration-300 shadow-lg overflow-hidden
        min-h-[385px] flex flex-col justify-end
        hover:border-lime
      `}
      style={{
        borderRadius: 24
      }}
    >
      {/* Image + overlays */}
      <div
        className={`
          absolute top-0 left-0 w-full aspect-square
          rounded-3xl overflow-hidden z-0  
        `}
      >
        <Image
          src={imgSrc}
          alt={proxy.displayName || proxy.xHandle}
          fill
          className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
          priority
        />

        {/* Top Expert Badge - lime */}
        {proxy.status === 'live' && (
          <div
            className={`
              absolute top-3 left-3 z-10 flex items-center gap-2 px-3 py-[0.35rem]
              rounded-full text-[14px] font-semibold
              transition-all duration-200
              bg-lime text-black shadow-md
            `}
          >
            <Star size={15} className="text-black" fill="currentColor" />
            Top Expert
          </div>
        )}
      </div>

      {/* Gradient/black overlay with blur for text content, visible on hover */}
      <div
        className={`
          absolute inset-x-0 bottom-0 h-[225px]
          pointer-events-none z-20
          opacity-0 group-hover:opacity-100
          group-hover:-translate-y-18
          transition-all duration-300
          rounded-b-3xl
          bg-linear-to-t from-black  to-transparent
 
        `}
      />

      {/* Content stack */}
      <div
        className={`
          relative z-30 flex flex-col w-full px-5 pb-3 pt-[55%] text-left
          transition-transform duration-300
          group-hover:-translate-y-18
          min-h-[185px]
        `}
      >
        {/* Name, badge, rating */}
        <div className="flex items-center gap-1 mb-1">
          <span className="font-medium text-white text-xl leading-tight tracking-tight max-w-[60%] truncate">
            {proxy.displayName || proxy.xHandle}
          </span>
          <BadgeCheck size={16} className="text-lime shrink-0" />
          <span className="flex items-center gap-1 ml-auto shrink-0">
            <Star size={15} fill="currentColor" className="text-white/90" />
            <span className="text-white/90 text-base font-semibold leading-none min-w-[1.5em]">
              {(proxy.rating ?? 0) > 0 ? (proxy.rating ?? 0).toFixed(1) : '5.0'}
            </span>
          </span>
        </div>

        {/* Bio */}
        <p
          className={`
          text-white/85 text-[16px] leading-[1.28] mb-2 min-h-[34px] font-sans transition-all duration-300
          line-clamp-2
        `}
        >
          {proxy.bio || `AI clone of @${proxy.xHandle}`}
        </p>

        {/* Price and change */}
        <div className="flex items-center justify-between text-[15px] font-bold mb-1">
          <div>
            <span className="text-white">${price}</span>
            <span className="text-white/50 font-normal text-xs"> / min</span>
          </div>
          <span className="text-lime">
            {isNegative ? '' : '+'}
            {change}%
          </span>
        </div>
      </div>

      {/* Hover: View Profile button */}
      <div
        className={`
          absolute left-0 bottom-0 w-full px-2 pb-3 flex justify-center z-40
          
        `}
      >
        <button
          className={`
            w-full py-3 bg-lime text-black text-[18px] font-bold
            shadow-lg font-sans text-center border-none
            opacity-0 group-hover:opacity-100
            transition-all duration-300 pointer-events-auto rounded-b-2xl rounded-t-lg
          `}
          style={{
            letterSpacing: '0.01em'
          }}
          tabIndex={-1}
          type="button"
        >
          View Profile
        </button>
      </div>
    </Link>
  );
}

export function ProxyCardSkeleton() {
  return (
    <div className="shrink-0 w-[260px] min-h-[375px] flex flex-col justify-end">
      <div className="w-full aspect-square rounded-2xl bg-dark2 animate-pulse mb-2.5" />
      <div className="h-4 w-1/2 bg-dark2 rounded animate-pulse mb-1" />
      <div className="h-3 w-full bg-dark2 rounded animate-pulse mb-1" />
      <div className="h-3 w-4/5 bg-dark2 rounded animate-pulse" />
    </div>
  );
}
