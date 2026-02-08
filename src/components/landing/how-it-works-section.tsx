'use client';

import { useRef, useEffect, useState } from 'react';
import { SiFarcaster } from 'react-icons/si';
import { LiaCloneSolid } from 'react-icons/lia';
import { FaXTwitter } from 'react-icons/fa6';
import { Link2, Dna, MessageCircle, Coins , Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ─────────────────── Step Data ─────────────────── */

const STEPS = [
  {
    num: '01',
    icon: Link2,
    title: 'Connect',
    desc: 'Link your X and Farcaster accounts. We ingest your posts, replies, and personality data — building the raw material for your clone.',
    visual: 'connect',
  },
  {
    num: '02',
    icon: Dna,
    title: 'Clone',
    desc: 'Our AI analyzes your voice, beliefs, and writing style. It builds a clone that talks, thinks, and responds just like you.',
    visual: 'clone',
  },
  {
    num: '03',
    icon: MessageCircle,
    title: 'Share',
    desc: 'Your clone goes live. Anyone can come chat with it for free — your knowledge, always available, 24/7.',
    visual: 'share',
  },
  {
    num: '04',
    icon: Coins,
    title: 'Tokenize',
    desc: 'Launch a token for your agent via Clanker or Flaunch on Base. You earn 50% of all trading fees. Forever.',
    visual: 'tokenize',
  },
];

const INTERVAL_MS = 5000; // Time each step stays active before auto-advancing

/* ─────────────────── Visual Components ─────────────────── */

function ConnectVisual() {
  return (
    <div className="w-full h-full bg-dark rounded-3xl relative overflow-hidden flex items-center justify-center gap-10">
      <SiFarcaster size={160} className="text-lime/20" />
      <FaXTwitter size={160} className="text-lime/20 " />  
    </div>
  );
}

function CloneVisual() {
  return (
    <div className="w-full h-full bg-dark rounded-3xl relative overflow-hidden flex items-center justify-center">
      <LiaCloneSolid size={160} className="text-lime/20" strokeWidth={1.2} />
      {/* Processing bars */}
      <div className="absolute top-6 left-6 right-6 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-lime/70 text-[10px] font-bold uppercase tracking-wide">Tone</span>
          <div className="flex-1 h-2 bg-lime/10 rounded-full overflow-hidden">
            <div className="h-full bg-lime/40 rounded-full w-[85%] animate-pulse" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lime/70 text-[10px] font-bold uppercase tracking-wide">Brain</span>
          <div className="flex-1 h-2 bg-lime/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-lime/40 rounded-full w-[70%] animate-pulse"
              style={{ animationDelay: '0.5s' }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lime/70 text-[10px] font-bold uppercase tracking-wide">Style</span>
          <div className="flex-1 h-2 bg-lime/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-lime/40 rounded-full w-[92%] animate-pulse"
              style={{ animationDelay: '1s' }}
            />
          </div>
        </div>
      </div>
      {/* Status badge */}
      <div className="absolute bottom-6 right-6 bg-lime/20 rounded-xl px-3 py-2 shadow-lg">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-lime animate-pulse" />
          <span className="text-lime/70 text-[11px] font-semibold">Building proxi...</span>
        </div>
      </div>
    </div>
  );
}

function ShareVisual() {
  return (
    <div className="w-full h-full bg-dark rounded-3xl relative overflow-hidden flex flex-col items-center justify-end pb-6 px-5">
      <MessageCircle size={160} className="text-lime/20 absolute top-8 left-1/2 -translate-x-1/2" strokeWidth={1.5} />
      {/* Chat thread */}
      <div className="flex flex-col gap-2.5 w-full">
        <div className="self-start bg-lime/20 rounded-2xl rounded-bl-sm px-3 py-2 shadow-lg max-w-[80%]">
          <span className="text-lime text-[11px]">What&apos;s your take on open source?</span>
        </div>
        <div className="self-end bg-lime/60 rounded-2xl rounded-br-sm px-3 py-2 shadow-lg max-w-[80%]">
          <span className="text-dark text-[11px]">It&apos;s how the best software gets built. Always has been.</span>
        </div>
        <div className="self-start bg-lime/20 rounded-2xl rounded-bl-sm px-3 py-2 shadow-lg max-w-[60%]">
          <span className="text-lime/40 text-[11px] flex items-center gap-1">
            <span className="inline-block w-1 h-1 rounded-full bg-lime/40 animate-pulse" />
            <span className="inline-block w-1 h-1 rounded-full bg-lime/30 animate-pulse" style={{ animationDelay: '0.2s' }} />
            <span className="inline-block w-1 h-1 rounded-full bg-lime/20 animate-pulse" style={{ animationDelay: '0.4s' }} />
          </span>
        </div>
      </div>
    </div>
  );
}

function TokenizeVisual() {
  return (
    <div className="w-full h-full bg-dark rounded-3xl relative overflow-hidden flex items-center justify-center">
      <Coins size={160} className="text-lime/20" strokeWidth={1.2} />
      {/* Revenue card */}
      <div className="absolute top-6 left-6 bg-lime/20 rounded-xl p-3 shadow-lg">
        <p className="text-lime/70 text-[10px] uppercase tracking-wider font-bold mb-1">Creator Revenue</p>
        <p className="text-lime text-xl font-bold font-heading">50%</p>
      </div>
      {/* Bar chart */}
      <div className="absolute bottom-5 right-6 flex items-end gap-1.5">
        {[6, 10, 8, 14, 11, 16].map((h, i) => (
          <div key={i} className="w-2.5 rounded-sm bg-lime/20" style={{ height: `${h * 3.5}px` }} />
        ))}
      </div>
      {/* Launch badge */}
      <div className="absolute bottom-5 left-6 bg-lime/20 rounded-lg px-3 py-1.5 shadow-lg flex items-center gap-1.5">
        <Zap size={11} className="text-lime" />
        <span className="text-lime text-[11px] font-medium">Token Live</span>
      </div>
    </div>
  );
}

const VISUAL_MAP: Record<string, React.FC> = {
  connect: ConnectVisual,
  clone: CloneVisual,
  share: ShareVisual,
  tokenize: TokenizeVisual,
};

/* ─────────────────── Main Section ─────────────────── */

export function HowItWorksSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // eslint-disable-next-line react-hooks/purity
  const startTimeRef = useRef(Date.now());

  // Reveal on scroll
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setRevealed(true); },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Start/restart timer when revealed or activeIndex changes
  useEffect(() => {
    if (!revealed) return;
    if (timerRef.current) clearInterval(timerRef.current);

    startTimeRef.current = Date.now();
    setProgress(0);

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.min((elapsed / INTERVAL_MS) * 100, 100);
      setProgress(pct);

      if (elapsed >= INTERVAL_MS) {
        if (timerRef.current) clearInterval(timerRef.current);
        setActiveIndex((prev) => (prev + 1) % STEPS.length);
      }
    }, 50);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [revealed, activeIndex]);

  const handleStepClick = (index: number) => {
    setActiveIndex(index);
    setProgress(0);
    // eslint-disable-next-line react-hooks/purity
    startTimeRef.current = Date.now();
  };

  const ActiveVisual = VISUAL_MAP[STEPS[activeIndex].visual];

  return (
    <section id="how" ref={sectionRef} className="py-24 md:py-32 px-6 max-w-[1100px] mx-auto">
      {/* Header */}
      <div
        className={`transition-all duration-700 ease-out ${
          revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        <div className="font-heading text-xs text-lime uppercase tracking-[0.15em] mb-4">
          How It Works
        </div>
        <h2 className="font-heading text-3xl md:text-5xl leading-[1.05] tracking-tight mb-5">
          Four steps to
          <br />
          immortalize yourself
        </h2>
        <p className="text-gray text-lg max-w-[520px] leading-relaxed mb-14">
          Your digital twin, onchain, earning while you sleep.
        </p>
      </div>

      {/* Two-column layout: Steps (left) | Visual (right) */}
      <div
        className={`grid grid-cols-1 md:grid-cols-2 gap-8 transition-all duration-700 ${
          revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        {/* Left: Accordion Steps — fixed height, no layout shift */}
        <div className="flex flex-col gap-2 md:h-[420px]">
          {STEPS.map((step, i) => {
            const isActive = i === activeIndex;
            const StepIcon = step.icon;

            return (
              <button
                key={step.num}
                onClick={() => handleStepClick(i)}
                className={cn(
                  'relative w-full text-left rounded-2xl overflow-hidden cursor-pointer border transition-colors duration-300',
                  isActive
                    ? 'bg-dark2 border-lime/20 flex-1'
                    : 'bg-dark2/60 border-white/6 hover:border-white/10 hover:bg-dark2/80'
                )}
              >
                {/* Progress bar at bottom — only on active step */}
                {isActive && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/5">
                    <div
                      className="h-full bg-lime/60 transition-none"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}

                <div className={cn('p-4', isActive && 'p-6')}>
                  {/* Header row */}
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        'rounded-xl flex items-center justify-center shrink-0 transition-all duration-300',
                        isActive
                          ? 'w-11 h-11 bg-lime/12'
                          : 'w-9 h-9 bg-white/5'
                      )}
                    >
                      <StepIcon
                        size={isActive ? 20 : 16}
                        className={isActive ? 'text-lime' : 'text-gray'}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <span className={cn(
                        'text-[10px] font-bold uppercase tracking-wider block',
                        isActive ? 'text-lime/60' : 'text-gray/40'
                      )}>
                        Step {step.num}
                      </span>
                      <h3 className={cn(
                        'font-bold tracking-tight transition-all duration-300',
                        isActive ? 'text-white text-xl' : 'text-white/70 text-md'
                      )}>
                        {step.title}
                      </h3>
                    </div>
                  </div>

                  {/* Expanded description — only on active */}
                  {isActive && (
                    <p className="text-gray text-sm leading-relaxed pl-15 mt-3 animate-fade-up">
                      {step.desc}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Right: Visual Panel */}
        <div className="hidden md:flex items-stretch">
          <div className="w-full rounded-3xl overflow-hidden relative bg-dark" style={{ minHeight: '420px' }}>
            {ActiveVisual && <ActiveVisual />}
          </div>
        </div>
      </div>
    </section>
  );
}
