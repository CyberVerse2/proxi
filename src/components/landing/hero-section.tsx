'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ProxyCard } from '@/components/proxy/proxy-card';
import type { Proxy } from '@/lib/db/schema';
import { CREATOR_FEE_PERCENT } from '@/lib/config/constants';

/* ─── Main Hero ─── */
interface HeroSectionProps {
  proxies?: Proxy[];
}

export function HeroSection({ proxies = [] }: HeroSectionProps) {
  // Build a seamless carousel — need enough cards to fill the viewport
  const sorted = [...proxies].sort((a, b) => (b.totalChats ?? 0) - (a.totalChats ?? 0));
  const carouselItems = sorted.length >= 5 ? sorted : [...sorted, ...sorted].slice(0, Math.max(sorted.length * 2, 8));

  return (
    <section className="min-h-screen flex flex-col items-center justify-center text-center px-6 pt-36 pb-20 relative">
      {/* Pulsing radial glow */}
      <div
        className="absolute top-1/2 left-1/2 w-[600px] h-[600px] rounded-full pointer-events-none animate-pulse-glow"
        style={{
          transform: 'translate(-50%, -50%)',
          background:
            'radial-gradient(circle, rgba(191,255,0,0.12) 0%, rgba(124,101,193,0.06) 50%, transparent 70%)',
        }}
      />

      {/* Badge */}
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-lime/20 bg-lime/5 text-sm font-semibold text-lime mb-8 animate-fade-up">
        <span className="w-2 h-2 rounded-full bg-lime animate-blink" />
        Live on BNB Smart Chain
      </div>

      {/* Headline */}
      <h1
        className="font-heading text-[clamp(3rem,8vw,6.5rem)] leading-none tracking-tight mb-7 relative animate-fade-up"
        style={{ animationDelay: '0.1s' }}
      >
        Clone Yourself.
        <br />
        <span className="text-lime relative inline-block">
          Earn Forever.
          <span className="absolute bottom-1 left-0 right-0 h-1.5 bg-lime/30 rounded-sm" />
        </span>
      </h1>

      {/* Subtitle */}
      <p
        className="text-gray text-[clamp(1.1rem,2vw,1.35rem)] max-w-[560px] leading-relaxed mb-11 animate-fade-up"
        style={{ animationDelay: '0.2s' }}
      >
        Create an AI clone of yourself that anyone can talk to.
        Each clone gets its own token — you earn {CREATOR_FEE_PERCENT}% of founder-tax revenue forever.
      </p>

      {/* Buttons */}
      <div
        className="flex items-center gap-4 flex-wrap justify-center animate-fade-up"
        style={{ animationDelay: '0.3s' }}
      >
        <Link
          href="https://x.com/intent/tweet?text=%40proxiagent%20clone%20me"
          target="_blank"
          className="bg-lime text-dark border-none px-7 py-3 rounded-full font-bold text-[0.95rem] cursor-pointer transition-all duration-300 hover:scale-105 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(191,255,0,0.3)] no-underline inline-block"
        >
          Clone Me on X
        </Link>
        <Button
          variant="outline"
          size="lg"
          onClick={() =>
            document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' })
          }
        >
          Explore Proxies
        </Button>
      </div>

      {/* Auto-scrolling Proxy Carousel */}
      {proxies.length > 0 && (
        <div
          className="mt-16 w-full relative animate-fade-up overflow-hidden"
          style={{
            animationDelay: '0.4s',
            maskImage:
              'linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)',
            WebkitMaskImage:
              'linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)',
          }}
        >
          {/* Scrolling track — duplicate items for seamless loop */}
          <div className="flex gap-5 px-4 animate-carousel-scroll hover:[animation-play-state:paused]">
            {[...carouselItems, ...carouselItems].map((proxy, i) => (
              <div key={`${proxy.id}-${i}`} className="shrink-0">
                <ProxyCard proxy={proxy} />
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
