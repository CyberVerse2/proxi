'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import Image from 'next/image';
import type { Proxy } from '@/lib/db/schema';

function CarouselCard({ proxy }: { proxy: Proxy }) {
  const handle = proxy.xHandle ?? proxy.id;
  const name = proxy.displayName ?? handle;
  const avatar = proxy.avatarUrl ?? '/mock-avatar.jpg';
  const price = (proxy.price ?? 0).toFixed(2);
  const bio = proxy.bio ?? '';

  return (
    <Link
      href={`/${handle}`}
      className="p-2 group shrink-0 w-[240px] flex flex-col rounded-3xl overflow-hidden border border-white/8 hover:border-lime/40 transition-all duration-400 no-underline shadow-[0_8px_40px_rgba(0,0,0,0.5)] hover:shadow-[0_12px_50px_rgba(191,255,0,0.08)] hover:-translate-y-1"
      style={{
        background: 'linear-gradient(160deg, rgba(26,26,38,0.95) 0%, rgba(18,18,26,0.98) 100%)',
        backdropFilter: 'blur(12px)'
      }}
    >
      {/* Image section */}
      <div className="relative w-full aspect-3/4 overflow-hidden rounded-3xl">
        <Image
          src={avatar}
          alt={name}
          fill
          className="object-cover transition-all duration-500 group-hover:scale-110 group-hover:brightness-110"
        />
        {/* Vignette overlay */}
        <div className="absolute inset-0 bg-linear-to-t from-dark2 via-transparent to-transparent opacity-80" />
        {/* Subtle inner glow ring */}
        <div className="absolute inset-0 shadow-[inset_0_0_30px_rgba(0,0,0,0.4)]" />
      </div>

      {/* Text section */}
      <div className="flex flex-col px-4 py-3 gap-1.5">
        <div className="flex items-center justify-between w-full">
          <span className="font-medium text-white text-[18px] truncate">{name}</span>
          <span className="text-white/80 shrink-0 ml-2 font-semibold text-[17px] tabular-nums">
            <span className="text-lime/50">${price}</span>
            <span className="text-white/40 font-normal"> / min</span>
          </span>
        </div>
        <p className="text-gray text-[16px] leading-snug line-clamp-2">{bio}</p>
      </div>
    </Link>
  );
}

interface HeroSectionProps {
  proxies?: Proxy[];
}

export function HeroSection({ proxies = [] }: HeroSectionProps) {
  const { login } = useAuth();

  // Duplicate the list for seamless infinite scroll; need at least ~10 cards to fill the viewport
  const carouselItems = proxies.length > 0
    ? [...proxies, ...proxies, ...proxies].slice(0, Math.max(proxies.length * 2, 10))
    : [];

  return (
    <section className="relative pt-24 md:pt-32 pb-0 px-6 md:px-10 overflow-hidden min-h-[90vh] flex flex-col">
      {/* Centered grid background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse 60% 65% at 50% 40%, black 0%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse 60% 65% at 50% 40%, black 0%, transparent 75%)'
        }}
      />

      {/* Radial glow — pulsing behind content */}
      <div
        className="absolute top-1/3 left-1/2 w-[700px] h-[700px] rounded-full pointer-events-none animate-pulse-glow"
        style={{
          transform: 'translate(-50%, -50%)',
          background:
            'radial-gradient(circle, rgba(191,255,0,0.10) 0%, rgba(124,101,193,0.06) 40%, transparent 70%)'
        }}
      />

      <div className="max-w-3xl mx-auto text-center space-y-6 relative z-10">
        <h1
          className="font-heading text-5xl md:text-8xl text-white leading-none tracking-tight animate-fade-up"
          style={{ animationDelay: '0.1s' }}
        >
          Clone Yourself.
          <br />
          <span className="text-lime">Tokenize It.</span>
        </h1>

        <p
          className="text-gray text-base md:text-xl max-w-lg mx-auto leading-relaxed animate-fade-up"
          style={{ animationDelay: '0.2s' }}
        >
          Build an AI version of you powered by your X &amp; Farcaster data. Let the world chat with
          your clone. Earn from your own token.
        </p>

        <div
          className="flex items-center justify-center gap-3 pt-3 animate-fade-up"
          style={{ animationDelay: '0.3s' }}
        >
          <Button size="lg" onClick={login}>
            Create Your Proxi
          </Button>
          <Button
            variant="outline"
            size="lg"
            onClick={() =>
              document.getElementById('explore')?.scrollIntoView({ behavior: 'smooth' })
            }
          >
            Explore Proxies
          </Button>
        </div>
      </div>

      {/* Horizontal Carousel — auto-scroll with edge fade + bottom bleed */}
      <div
        className="relative w-full mt-auto pt-12 overflow-hidden"
        style={{
          maskImage:
            'linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%), linear-gradient(to top, transparent 0%, black 30%)',
          WebkitMaskImage:
            'linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%), linear-gradient(to top, transparent 0%, black 30%)',
          maskComposite: 'intersect',
          WebkitMaskComposite: 'source-in'
        }}
      >
        <div className="flex gap-5 px-4 animate-carousel-scroll">
          {carouselItems.map((proxy, i) => (
            <CarouselCard key={`${proxy.id}-${i}`} proxy={proxy} />
          ))}
        </div>
      </div>
    </section>
  );
}
