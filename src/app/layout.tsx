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
  title: "Proxi — The AI Social Token Network",
  description:
    "Create your AI-powered digital clone from your public and private data. Tokenize your worldview, let anyone chat with your proxy",
  icons: {
    icon: "/image.png",
    apple: "/image.png",
  },
  openGraph: {
    title: "Proxi — The AI Social Token Network",
    description:
      "Create your AI-powered digital clone from your public and private data. Tokenize your worldview and let anyone chat with your proxy.",
    images: [
      {
        url: "/og_image.png",
        width: 1200,
        height: 630,
        alt: "Proxi AI Social Token",
      },
    ],
    type: "website",
    siteName: "Proxi",
    url: "https://proxi.fun",
  },
  twitter: {
    card: "summary_large_image",
    site: "@proxiagent",
    title: "Proxi — The AI Social Token Network",
    description:
      "Create and trade AI clones from your X data. Own your token. Chat with anyone’s AI.",
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
