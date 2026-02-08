'use client';

import Link from 'next/link';
import Image from 'next/image';

const FOOTER_LINKS = [
  { label: 'X / Twitter', href: 'https://x.com' },
  { label: 'Farcaster', href: 'https://warpcast.com' },
  { label: 'Docs', href: '#' },
  { label: 'GitHub', href: 'https://github.com' },
];

export function Footer() {
  return (
    <footer className="py-10 px-6 md:px-10 max-w-[1100px] mx-auto">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 border-t border-white/6 pt-10">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <Image src="/tools/proxi-logo.png" alt="Proxi" width={40} height={40} className="shrink-0" />
          <span className="font-heading text-white text-base tracking-tight">proxi</span>
          <span className="text-gray/40 text-sm ml-2">© 2026</span>
        </div>

        {/* Links */}
        <ul className="flex gap-6 list-none">
          {FOOTER_LINKS.map((link) => (
            <li key={link.label}>
              <Link
                href={link.href}
                className="text-gray text-sm no-underline hover:text-lime transition-colors duration-200"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      {/* Bottom tagline */}
      <p className="text-center text-white/4 font-heading text-xs uppercase tracking-[0.2em] mt-8 select-none">
        Built on Base
      </p>
    </footer>
  );
}
