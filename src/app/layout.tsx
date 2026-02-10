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
  title: "Proxi — Clone Yourself. Earn Forever.",
  description:
    "Create an AI clone of yourself that anyone can talk to. Each clone gets its own token — you earn 50% of fees forever.",
  icons: {
    icon: "/image.png",
    apple: "/image.png",
  },
  openGraph: {
    title: "Proxi — Clone Yourself. Earn Forever.",
    description:
      "Create an AI clone of yourself that anyone can talk to. Each clone gets its own token — you earn 50% of fees forever.",
    images: [
      {
        url: "/og_image.png",
        width: 1200,
        height: 630,
        alt: "Proxi Clone Yourself. Earn Forever.",
      },
    ],
    type: "website",
    siteName: "Proxi",
    url: "https://proxi.fun",
  },
  twitter: {
    card: "summary_large_image",
    site: "@proxiagent",
    title: "Proxi — Clone Yourself. Earn Forever.",
    description:
      "Create an AI clone of yourself that anyone can talk to. Each clone gets its own token — you earn 50% of fees forever.",
    images: ["/og-image.png"],
  },
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
