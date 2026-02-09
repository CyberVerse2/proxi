'use client';

import { useRef, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function CtaSection() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setVisible(true);
      },
      { threshold: 0.15 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="relative py-36 md:py-44 px-6 text-center overflow-hidden"
    >
      {/* Pulsing glow */}
      <div
        className="absolute top-1/2 left-1/2 w-[500px] h-[500px] rounded-full pointer-events-none animate-pulse-glow"
        style={{
          transform: 'translate(-50%, -50%)',
          background:
            'radial-gradient(circle, rgba(124,101,193,0.15) 0%, rgba(191,255,0,0.05) 50%, transparent 70%)',
        }}
      />

      <div
        className={`relative transition-all duration-800 ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        <h2 className="font-heading text-[clamp(2.5rem,5vw,4rem)] leading-[1.05] tracking-tight mb-5">
          Ready to clone
          <br />
          yourself?
        </h2>
        <p className="text-gray text-lg mb-10 max-w-md mx-auto leading-relaxed">
          Your AI clone is one tag away. Just say &quot;@proxiagent clone me&quot; on X.
        </p>
        <div
          className={`flex gap-4 justify-center flex-wrap transition-all duration-700 ${
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
          style={{ transitionDelay: '0.15s' }}
        >
          <Link
            href="https://x.com/intent/tweet?text=%40proxiagent%20clone%20me"
            target="_blank"
            className="bg-lime text-dark border-none px-7 py-3 rounded-full font-bold text-[0.95rem] cursor-pointer transition-all duration-300 hover:scale-105 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(191,255,0,0.3)] no-underline inline-block"
          >
            Clone Me on X
          </Link>
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
