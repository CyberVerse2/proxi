"use client";

import { HeroSection } from "@/components/landing/hero-section";
import { MarqueeSection } from "@/components/landing/marquee-section";
import { HowItWorksSection } from "@/components/landing/how-it-works-section";
import { FeaturesSection } from "@/components/landing/features-section";
import { PoweredBySection } from "@/components/landing/powered-by-section";
import { CtaSection } from "@/components/landing/cta-section";
import { Footer } from "@/components/landing/footer";
import type { Proxy } from "@/lib/db/schema";

interface LandingPageClientProps {
  proxies: Proxy[];
}

export function LandingPageClient({ proxies }: LandingPageClientProps) {
  return (
    <div className="min-h-screen">
      <HeroSection proxies={proxies} />
      <MarqueeSection />
      <HowItWorksSection />
      <FeaturesSection />
      <PoweredBySection />
      <CtaSection />
      <Footer />
    </div>
  );
}
