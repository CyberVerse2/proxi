'use client';

import { useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

const STEPS = [
  {
    num: '01',
    emoji: '🔗',
    iconBg: 'bg-farcaster/15',
    title: 'Tag',
    desc: 'Tag @proxiagent "clone me" on X. We start building your proxi instantly — no signup needed.',
  },
  {
    num: '02',
    emoji: '🧬',
    iconBg: 'bg-lime/12',
    title: 'Clone',
    desc: 'Our AI builds a clone that talks, thinks, and responds just like you. Upload more data to make it smarter.',
  },
  {
    num: '03',
    emoji: '💬',
    iconBg: 'bg-base-blue/15',
    title: 'Go Live',
    desc: "Your clone goes live in minutes. Anyone can chat with it — your knowledge, always online, always available.",
  },
  {
    num: '04',
    emoji: '🪙',
    iconBg: 'bg-red-400/12',
    title: 'Claim & Earn',
    desc: 'Visit proxi.fun, connect your X to prove ownership, and unlock your 50% fee share. Earn forever.',
  },
];

export function HowItWorksSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setRevealed(true);
      },
      { threshold: 0.15 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section
      id="how"
      ref={sectionRef}
      className="py-24 md:py-32 px-6 max-w-[1100px] mx-auto"
    >
      {/* Header */}
      <div
        className={cn(
          'transition-all duration-700 ease-out',
          revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8',
        )}
      >
        <div className="font-heading text-xs text-lime uppercase tracking-[0.15em] mb-4">
          How It Works
        </div>
        <h2 className="font-heading text-3xl md:text-[3.2rem] leading-[1.1] tracking-tight mb-5">
          Four steps to
          <br />
          clone yourself
        </h2>
        <p className="text-gray text-lg max-w-[520px] leading-relaxed mb-14">
          Tag us on X. Your digital twin goes live in minutes.
        </p>
      </div>

      {/* 4-column grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {STEPS.map((step, i) => (
          <div
            key={step.num}
            className={cn(
              'group bg-dark2 border border-white/6 rounded-3xl p-8 sm:p-7 relative overflow-hidden transition-all duration-400 hover:border-lime/15 hover:-translate-y-1',
              revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10',
            )}
            style={{
              transitionDelay: revealed ? `${i * 100 + 200}ms` : '0ms',
            }}
          >
            {/* Top lime accent on hover */}
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-linear-to-r from-lime to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-400" />

            {/* Large faded step number */}
            <div className="font-heading text-5xl text-lime/8 leading-none mb-4">
              {step.num}
            </div>

            {/* Icon */}
            <div
              className={cn(
                'w-12 h-12 rounded-[14px] flex items-center justify-center text-[1.4rem] mb-5',
                step.iconBg,
              )}
            >
              {step.emoji}
            </div>

            <h3 className="text-white font-bold text-[1.05rem] mb-2.5">
              {step.title}
            </h3>
            <p className="text-gray text-sm leading-relaxed">
              {step.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
