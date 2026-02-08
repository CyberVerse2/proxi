import type { Metadata } from 'next';
import { DM_Sans, Dela_Gothic_One } from 'next/font/google';
import {} from 'next/font/google';
import { Providers } from '@/components/providers';
import './globals.css';

const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700']
});
const delaGothic = Dela_Gothic_One({
  variable: '--font-dela-gothic',
  subsets: ['latin'],
  weight: '400'
});

export const metadata: Metadata = {
  title: 'Proxi — Clone Yourself. Tokenize It.',
  description:
    'Build an AI version of you powered by your X data. Let the world chat with your clone.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${delaGothic.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
