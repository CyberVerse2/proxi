'use client';

import { useRef, useEffect, useState } from 'react';
import Image from 'next/image';
import { SiFarcaster } from 'react-icons/si';

const POWERED_ITEMS: PoweredItem[] = [
  {
    name: 'Base',
    image: '/tools/base.png',
    hoverColor: '#0052FF',
  },
  {
    name: 'Farcaster',
    reactIcon: 'farcaster',
    hoverColor: '#8A63D2',
  },
  {
    name: 'Clanker',
    image: '/tools/clank.png',
    hoverColor: '#BFFF00',
  },
  {
    name: 'Flaunch',
    image: '/tools/flaunch-header.png',
    hoverColor: '#FF8C42',
  },
];

interface PoweredItem {
  name: string;
  image?: string;
  reactIcon?: 'farcaster';
  hoverColor: string;
}

export function PoweredBySection() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`py-20 px-6 border-t border-b border-white/6 transition-all duration-700 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      }`}
    >
      <p className="text-center text-gray/60 text-xs uppercase tracking-[0.2em] font-semibold mb-10">
        Powered by
      </p>
      <div className="flex flex-wrap items-center justify-center gap-10 md:gap-16 max-w-6xl mx-auto">
        {POWERED_ITEMS.map((item) => (
          <PoweredCard key={item.name} item={item} />
        ))}
      </div>
    </div>
  );
}

function PoweredCard({ item }: { item: PoweredItem }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="group flex flex-col items-center gap-3 cursor-default transition-transform duration-300 hover:-translate-y-1"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Icon / Image */}
      <div className="w-30 h-30 flex items-center justify-center">
        {item.reactIcon === 'farcaster' && (
          <div
            className="transition-all duration-400"
            style={{ color: hovered ? item.hoverColor : 'rgba(255,255,255,0.25)' }}
          >
            <SiFarcaster
              size={70}
              className="transition-transform duration-300 group-hover:scale-110"
            />
          </div>
        )}

        {item.image && (
          <Image
            src={item.image}
            alt={item.name}
            width={300}
            height={300}
            className="object-contain transition-all duration-400 opacity-30 grayscale group-hover:opacity-100 group-hover:grayscale-0 group-hover:scale-110"
          />
        )}
      </div>

      {/* Label */}
      <span
        className="text-sm font-semibold transition-colors duration-400"
        style={{ color: hovered ? item.hoverColor : 'rgba(255,255,255,0.25)' }}
      >
        {item.name}
      </span>
    </div>
  );
}