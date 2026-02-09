'use client';

import { useRef, useEffect, useState } from 'react';
import { SiFarcaster } from 'react-icons/si';
import { FaXTwitter } from 'react-icons/fa6';
import { BookOpen, Globe, Zap, Gem, MessageCircle, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CREATOR_FEE_PERCENT } from '@/lib/config/constants';

/* ══════════════════════════════════════════════════════════════
   FEATURE DATA — edit sizes, layout, and grid placement here
   ══════════════════════════════════════════════════════════════

   layout:
     'horizontal'  → text left · visual right  (side-by-side)
     'vertical'    → visual top · text bottom   (stacked)
     'text-only'   → full-width text, no visual panel

   gridClass:
     Controls the card's column/row position on desktop.
     Uses Tailwind's grid-* utilities. Rows auto-size to ~100px each.

   visualRatio:
     For 'horizontal': the right visual panel width  (e.g. '55%')
     For 'vertical':   the top visual panel height   (e.g. '200px')
     Ignored for 'text-only'.
*/

const FEATURES: FeatureItem[] = [
  {
    icon: Link2,
    title: 'X + Farcaster Sync',
    desc: "Automatically ingests your posts, replies, threads, and casts to build your clone's personality and knowledge base.",
    visual: 'sync',
    layout: 'horizontal',
    gridClass: 'md:col-start-1 md:col-end-2 md:row-start-1 md:row-end-4',  // col 1, rows 1-3
    visualRatio: '50%',
  },
  {
    icon: Gem,
    title: 'Proxi Tokenomics',
    desc: `Each proxi gets its own tradeable token launched on Base. Creators earn ${CREATOR_FEE_PERCENT}% of all fees — your clone is literally an asset.`,
    visual: 'token',
    layout: 'vertical',
    gridClass: 'md:col-start-2 md:col-end-3 md:row-start-1 md:row-end-5',  // col 2, rows 1-4 (taller)
    visualRatio: '55%',
  },
  {
    icon: BookOpen,
    title: 'Custom Data Upload',
    desc: 'Upload documents, notes, or chat directly with your proxi to teach it things only you know.',
    visual: 'upload',
    layout: 'horizontal-reverse',
    gridClass: 'md:col-start-1 md:col-end-2 md:row-start-4 md:row-end-7',  // col 1, rows 4-7
    visualRatio: '52%',
  },
  {
    icon: Globe,
    title: 'Open Chat',
    desc: 'Anyone can discover and chat with any proxi on the platform, no login required.',
    visual: 'chat',
    layout: 'horizontal',
    gridClass: 'md:col-start-2 md:col-end-3 md:row-start-5 md:row-end-7',  // col 2, rows 5-8
    visualRatio: '48%',
  },
];

interface FeatureItem {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  desc: string;
  visual: string;
  layout: 'horizontal' | 'horizontal-reverse' | 'vertical' | 'text-only';
  gridClass: string;
  visualRatio: string;
}

/* ════════════════════ Visual Illustrations ════════════════════ */

function SyncVisual() {
  return (
    <div className="w-full h-full bg-lime rounded-2xl relative overflow-hidden flex items-center justify-center gap-4">
      <FaXTwitter size={56} className="text-dark/20" />
      <SiFarcaster size={56} className="text-dark/20" />
    </div>
  );
}

function TokenVisual() {
  return (
    <div className="w-full h-full bg-lime rounded-2xl relative overflow-hidden">
      <div className="absolute inset-0 flex items-center justify-center">
        <Gem size={100} className="text-dark/12" strokeWidth={1} />
      </div>
      <div className="absolute top-1/2 right-5 -translate-y-1/2 bg-dark/90 rounded-lg px-3 py-2 shadow-lg flex items-center gap-2">
        <div className="w-5 h-5 rounded-full bg-lime/30 flex items-center justify-center">
          <Zap size={10} className="text-lime" />
        </div>
        <span className="text-white text-[11px] font-medium leading-tight">
          +{CREATOR_FEE_PERCENT}% proxy<br />revenue
        </span>
      </div>
      <div className="absolute bottom-4 left-5 flex items-end gap-1.5">
        <div className="w-3 h-6 rounded-sm bg-dark/20" />
        <div className="w-3 h-10 rounded-sm bg-dark/20" />
        <div className="w-3 h-14 rounded-sm bg-dark/25" />
        <div className="w-3 h-8 rounded-sm bg-dark/20" />
      </div>
    </div>
  );
}

function UploadVisual() {
  return (
    <div className="w-full h-full bg-lime rounded-2xl relative overflow-hidden flex flex-col items-center justify-center gap-2">
      <div className="relative w-28 h-20">
        <div className="absolute bottom-0 left-2 right-2 h-16 bg-dark/15 rounded-lg border border-dark/10" />
        <div className="absolute bottom-2 left-1 right-1 h-16 bg-dark/20 rounded-lg border border-dark/10" />
        <div className="absolute bottom-4 left-0 right-0 h-16 bg-dark/25 rounded-lg border border-dark/10 flex flex-col gap-1 p-3">
          <div className="w-full h-1.5 bg-dark/20 rounded-full" />
          <div className="w-3/4 h-1.5 bg-dark/20 rounded-full" />
          <div className="w-1/2 h-1.5 bg-dark/20 rounded-full" />
        </div>
      </div>
      <div className="bg-dark/80 rounded-full px-3 py-1 flex items-center gap-1.5 shadow-lg">
        <div className="w-4 h-4 rounded-full bg-lime/50 flex items-center justify-center">
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
            <path d="M1 4l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-dark" />
          </svg>
        </div>
        <span className="text-white text-[11px] font-semibold">Uploaded</span>
      </div>
    </div>
  );
}

function ChatVisual() {
  return (
    <div className="w-full h-full bg-lime rounded-2xl relative overflow-hidden flex items-end justify-center pb-4">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <MessageCircle size={44} className="text-dark/15" strokeWidth={1.5} />
      </div>
      <div className="flex flex-col gap-2 w-full px-3">
        <div className="self-start bg-dark/80 rounded-xl rounded-bl-none px-3 py-1.5 shadow-lg max-w-[78%]">
          <span className="text-white text-[11px]">What do you think about AI?</span>
        </div>
        <div className="self-end bg-dark/90 rounded-xl rounded-br-none px-3 py-1.5 shadow-lg max-w-[78%]">
          <span className="text-lime text-[11px]">It&apos;s the future of human expression.</span>
        </div>
      </div>
    </div>
  );
}

const VISUAL_MAP: Record<string, React.FC> = {
  sync: SyncVisual,
  token: TokenVisual,
  upload: UploadVisual,
  chat: ChatVisual,
};

/* ════════════════════ Section ════════════════════ */

export function FeaturesSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setRevealed(true); },
      { threshold: 0.08 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section id="features" ref={sectionRef} className="py-24 md:py-32 px-6 max-w-[1100px] mx-auto">
      {/* Header */}
      <div
        className={cn(
          'transition-all duration-700',
          revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        )}
      >
        <div className="font-heading text-xs text-lime uppercase tracking-[0.15em] mb-4">
          Features
        </div>
        <h2 className="font-heading text-3xl md:text-5xl leading-[1.05] tracking-tight mb-5">
          Everything your
          <br />
          clone needs
        </h2>
        <p className="text-gray text-lg max-w-[520px] leading-relaxed mb-14">
          A full platform for creating, training, and monetizing AI versions of yourself.
        </p>
      </div>

      {/*
        Bento Grid
        ──────────
        Desktop: 2 columns, auto rows of ~90px each.
        Each card spans different row counts via gridClass → different heights.
        Mobile: single column, cards stack with their own min-heights.
      */}
      <div className="grid grid-cols-1 md:grid-cols-2 md:auto-rows-[100px] gap-4">
        {FEATURES.map((feature, i) => (
          <BentoCard key={feature.title} feature={feature} index={i} revealed={revealed} />
        ))}
      </div>
    </section>
  );
}

/* ════════════════════ Bento Card ════════════════════ */

function BentoCard({
  feature,
  index,
  revealed,
}: {
  feature: FeatureItem;
  index: number;
  revealed: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!revealed) return;
    const t = setTimeout(() => setVisible(true), index * 100);
    return () => clearTimeout(t);
  }, [revealed, index]);

  const Visual = VISUAL_MAP[feature.visual];

  const isHorizontal = feature.layout === 'horizontal' || feature.layout === 'horizontal-reverse';
  const isReversed = feature.layout === 'horizontal-reverse';
  const isVertical = feature.layout === 'vertical';

  return (
    <div
      ref={ref}
      className={cn(
        'group relative rounded-3xl overflow-hidden transition-all duration-500 hover:-translate-y-1',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6',
        // Mobile: auto height. Desktop: grid placement from gridClass
        'min-h-[260px] md:min-h-0',
        feature.gridClass
      )}
      style={{
        background: 'linear-gradient(145deg, rgba(30,30,42,0.9) 0%, rgba(20,20,30,0.95) 100%)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Hover border glow */}
      <div className="absolute inset-0 rounded-3xl border border-lime/0 group-hover:border-lime/15 transition-all duration-400 pointer-events-none z-10" />

      {/* Card inner layout */}
      {isHorizontal && (
        <div className={cn('flex h-full', isReversed && 'flex-row-reverse')}>
          {/* Text */}
          <div className="flex flex-col justify-center p-7 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-lime/10 flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110">
              <feature.icon size={20} className="text-lime" />
            </div>
            <h3 className="font-heading text-lg tracking-tight mb-2 leading-tight">{feature.title}</h3>
            <p className="text-gray text-sm leading-relaxed">{feature.desc}</p>
          </div>
          {/* Visual */}
          <div className="p-3 shrink-0" style={{ width: feature.visualRatio }}>
            {Visual && <Visual />}
          </div>
        </div>
      )}

      {isVertical && (
        <div className="flex flex-col h-full">
          {/* Visual */}
          <div className="p-3 shrink-0" style={{ height: feature.visualRatio }}>
            {Visual && <Visual />}
          </div>
          {/* Text */}
          <div className="flex flex-col justify-center p-7 pt-2 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-lime/10 flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110">
              <feature.icon size={20} className="text-lime" />
            </div>
            <h3 className="font-heading text-lg tracking-tight mb-2 leading-tight">{feature.title}</h3>
            <p className="text-gray text-sm leading-relaxed">{feature.desc}</p>
          </div>
        </div>
      )}

      {feature.layout === 'text-only' && (
        <div className="flex flex-col justify-center p-8 h-full">
          <div className="w-10 h-10 rounded-xl bg-lime/10 flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110">
            <feature.icon size={20} className="text-lime" />
          </div>
          <h3 className="font-heading text-lg tracking-tight mb-2 leading-tight">{feature.title}</h3>
          <p className="text-gray text-sm leading-relaxed">{feature.desc}</p>
        </div>
      )}
    </div>
  );
}
