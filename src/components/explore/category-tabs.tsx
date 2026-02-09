"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import {
  LayoutGrid, Flame, Building2, Sparkles, HandCoins,
  Layout, Activity, TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const CATEGORIES = [
  { id: "all", label: "All Proxies", icon: LayoutGrid },
  { id: "top", label: "Top Proxies", icon: Flame },
  { id: "trending", label: "Trending", icon: TrendingUp },
  { id: "founders", label: "Founders", icon: Building2 },
  { id: "influencers", label: "Influencers", icon: Sparkles },
  { id: "investors", label: "Investors", icon: HandCoins },
  { id: "design", label: "UI/UX Design", icon: Layout },
  { id: "athletes", label: "Athletes", icon: Activity },
];

interface TabSectionProps {
  active?: string;
  onChange?: (id: string) => void;
  /** Landing page only: show category header with See all button */
  showSeeAll?: boolean;
  seeAllHref?: string;
  /** Subtitle for the active category (e.g. "Featured Proxies") */
  seeAllSubtitle?: string;
  /** Use compact pill style (explore page) vs icon-above-text (landing) */
  variant?: "default" | "compact";
}

export function TabSection({
  active = "all",
  onChange,
  showSeeAll = false,
  seeAllHref,
  seeAllSubtitle = "Featured Proxies",
  variant = "default",
}: TabSectionProps) {
  const activeCat = CATEGORIES.find((c) => c.id === active) ?? CATEGORIES[0];

  if (variant === "compact") {
    return (
      <div className="space-y-3">
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onChange?.(cat.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] whitespace-nowrap transition-colors cursor-pointer shrink-0",
                active === cat.id
                  ? "bg-lime/10 text-lime border border-lime/20"
                  : "text-gray hover:text-white border border-transparent hover:border-white/6"
              )}
            >
              <cat.icon size={13} />
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {/* Tab navigation - icon above text */}
      <div className="flex gap-8 overflow-x-auto scrollbar-none justify-start pb-0">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onChange?.(cat.id)}
            className={cn(
              "flex flex-col items-center gap-1.5 pb-3 pt-1 relative cursor-pointer transition-colors whitespace-nowrap shrink-0",
              active === cat.id ? "text-lime" : "text-gray hover:text-white"
            )}
          >
            <cat.icon size={26} className={active === cat.id ? "text-lime" : undefined} />
            <span className="text-[12px] font-medium">{cat.label}</span>
            {active === cat.id && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-lime rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="w-full h-px bg-lime/20 my-4" />

      {/* Content summary - landing page only */}
      {showSeeAll && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-lime/20 flex items-center justify-center shrink-0">
              <activeCat.icon size={20} className="text-lime" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-lg">{activeCat.label}</h2>
              <p className="text-gray text-sm">{seeAllSubtitle}</p>
            </div>
          </div>
          {seeAllHref && (
            <Link
              href={seeAllHref}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/5 border border-lime/20 text-white text-sm font-medium hover:bg-white/8 hover:border-lime/30 transition-colors no-underline shrink-0"
            >
              See all <ChevronRight size={16} />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

/** @deprecated Use TabSection instead */
export function CategoryTabs(props: Omit<TabSectionProps, "showSeeAll" | "seeAllHref" | "seeAllSubtitle">) {
  return <TabSection {...props} />;
}
