'use client';

import Image from 'next/image';

export function ChatBackground({ avatar }: { avatar: string }) {
  return (
    <div
      aria-hidden
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ overflow: 'hidden' }}
    >
      {/* Layer 1: blurred PFP fills entire viewport (ambient sides) */}
      <Image
        src={avatar}
        alt=""
        fill
        className="object-cover blur-3xl scale-125 opacity-30"
        style={{ pointerEvents: 'none', userSelect: 'none' }}
        priority
      />
      {/* Layer 2: clearer PFP in center with radial fade — NOT too bright */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${avatar})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center 30%',
          opacity: 0.35,
          maskImage: 'radial-gradient(ellipse 50% 45% at 50% 35%, black 0%, transparent 75%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 50% 45% at 50% 35%, black 0%, transparent 75%)',
          pointerEvents: 'none',
          userSelect: 'none'
        }}
      />
      {/* Layer 3: dark overlay — heavier at edges, medium in center */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 55% 50% at 50% 35%, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.85) 100%)',
          pointerEvents: 'none',
          userSelect: 'none'
        }}
      />
    </div>
  );
}
