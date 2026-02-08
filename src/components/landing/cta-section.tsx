'use client';

import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import Link from 'next/link';

export function CtaSection() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const { login } = useAuth();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setVisible(true);
      },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="relative py-36 md:py-44 px-6 text-center overflow-hidden"
    >
      {/* Pulsing glow — purple/lime blend */}
      <div
        className="absolute top-1/2 left-1/2 w-[600px] h-[600px] rounded-full pointer-events-none animate-pulse-glow"
        style={{
          transform: 'translate(-50%, -50%)',
          background:
            'radial-gradient(circle, rgba(124,101,193,0.18) 0%, rgba(191,255,0,0.06) 50%, transparent 70%)',
        }}
      />

      {/* Centered grid background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)`,
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse 50% 60% at 50% 50%, black 0%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(ellipse 50% 60% at 50% 50%, black 0%, transparent 70%)',
        }}
      />

      <div
        className={`relative transition-all duration-800 ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        <h2 className="font-heading text-4xl md:text-7xl leading-none tracking-tight mb-6">
          Ready to clone
          <br />
          <span className="text-lime">yourself?</span>
        </h2>
        <p className="text-gray text-lg md:text-xl mb-10 max-w-md mx-auto leading-relaxed">
          Your AI twin is one click away. Start earning from your digital presence.
        </p>
        <div
          className={`flex gap-4 justify-center flex-wrap transition-all duration-700 ${
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
          style={{ transitionDelay: '0.15s' }}
        >
          <Button size="lg" onClick={login}>
            Create Your Proxi
          </Button>
          <Link href="#" className="no-underline">
            <Button variant="outline" size="lg" type="button">
              Read the Docs
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
