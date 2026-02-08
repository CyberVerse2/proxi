'use client';

const MARQUEE_ITEMS = [
  'Clone Yourself',
  'Tokenize Your Agent',
  'Chat With Anyone',
  'Earn From Your Clone',
  'Powered By Base',
  'Farcaster Native',
];

export function MarqueeSection() {
  // Double for seamless loop
  const items = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS];
  return (
    <div className="overflow-hidden py-6 border-t border-b border-white/6 relative">
      {/* Subtle lime gradient bleed behind */}
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          background:
            'linear-gradient(90deg, transparent, rgba(191,255,0,0.03) 30%, rgba(191,255,0,0.03) 70%, transparent)',
        }}
      />
      <div className="flex gap-0 animate-marquee" style={{ width: 'max-content' }}>
        {items.map((text, i) => (
          <span key={`${text}-${i}`} className="flex items-center gap-0">
            <span className="font-heading text-sm md:text-base uppercase tracking-[0.12em] whitespace-nowrap text-white/10 px-6">
              {text}
            </span>
            <span className="text-lime/30 text-lg">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}
