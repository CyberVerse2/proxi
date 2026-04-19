'use client';

import Link from 'next/link';

const FOOTER_LINKS = [
  { label: 'X / Twitter', href: 'https://x.com/proxiagent' },
  { label: 'Farcaster', href: 'https://warpcast.com' },
  { label: 'Docs', href: '#' },
  { label: 'GitHub', href: 'https://github.com' },
];

export function Footer() {
  return (
    <footer className="max-w-[1100px] mx-auto px-6 md:px-10 py-10 border-t border-white/4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-5">
        <p className="text-gray text-sm">
          © {new Date().getFullYear()} Proxi. Built on BNB Smart Chain.
        </p>

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
    </footer>
  );
}
