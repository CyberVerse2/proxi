'use client';

const ITEMS = [
  'Clone Yourself',
  'Earn Forever',
  'Chat With Anyone',
  'Your Intelligence Uploaded',
  'Powered By Base',
  'Always Online',
];

export function MarqueeSection() {
  // Duplicate items twice for seamless infinite scroll
  const doubled = [...ITEMS, ...ITEMS];

  return (
    <div className="overflow-hidden py-5 border-t border-b border-white/4">
      <div className="flex gap-12 animate-marquee w-max">
        {doubled.map((text, i) => (
          <span key={i} className="flex items-center gap-12">
            <span className="font-heading text-base text-white/6 whitespace-nowrap uppercase tracking-widest">
              {text}
            </span>
            <span className="font-heading text-base text-lime/12 whitespace-nowrap">
              ★
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
