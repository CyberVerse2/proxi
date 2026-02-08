"use client";

import { useState, useMemo } from "react";
import { HeroSection } from "@/components/landing/hero-section";
import { HowItWorksSection } from "@/components/landing/how-it-works-section";
import { FeaturesSection } from "@/components/landing/features-section";
import { PoweredBySection } from "@/components/landing/powered-by-section";
import { CtaSection } from "@/components/landing/cta-section";
import { Footer } from "@/components/landing/footer";
import { TabSection } from "@/components/explore/category-tabs";
import { ProxyRow } from "@/components/explore/proxy-row";
import type { Proxy } from "@/lib/db/schema";

interface LandingPageClientProps {
  proxies: Proxy[];
}

export function LandingPageClient({ proxies }: LandingPageClientProps) {
  const [activeCategory, setActiveCategory] = useState("all");

  const filteredProxies = useMemo(() => {
    if (activeCategory === "all") return proxies;
    if (activeCategory === "top") return [...proxies].sort((a, b) => (b.totalChats ?? 0) - (a.totalChats ?? 0));
    if (activeCategory === "trending") return [...proxies].sort((a, b) => (b.priceChange24h ?? 0) - (a.priceChange24h ?? 0));
    // Category-based filters — no category IDs assigned yet, so return empty
    return proxies.filter((p) => p.categoryId === activeCategory);
  }, [proxies, activeCategory]);

  return (
    <div className="min-h-screen">
      <HeroSection proxies={proxies} />

      <div id="explore" className="max-w-[1200px] mx-auto px-6 pb-20 space-y-8 mt-24">
        <TabSection
          variant="compact"
          active={activeCategory}
          onChange={setActiveCategory}
          showSeeAll
          seeAllHref="/explore"
          seeAllSubtitle="Most popular AI clones this week"
        />

        <ProxyRow
          title="Top Creators"
          subtitle="Most popular AI clones this week"
          proxies={filteredProxies}
          hideHeader
        />
      </div>

      <HowItWorksSection />
      <FeaturesSection />
      <PoweredBySection />
      <CtaSection />
      <Footer />
    </div>
  );
}
