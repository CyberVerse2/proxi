"use client";

import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { TabSection, buildCategoryList } from "@/components/explore/category-tabs";
import { ProxyRow } from "@/components/explore/proxy-row";
import type { Proxy } from "@/lib/db/schema";

interface DbCategory {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
}

interface ExplorePageClientProps {
  topProxies: Proxy[];
  trendingProxies: Proxy[];
  dbCategories?: DbCategory[];
}

export function ExplorePageClient({ topProxies, trendingProxies, dbCategories }: ExplorePageClientProps) {
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");

  // Merge and deduplicate all proxies
  const allProxies = useMemo(() => {
    const map = new Map<string, Proxy>();
    [...topProxies, ...trendingProxies].forEach((p) => map.set(p.id, p));
    return Array.from(map.values());
  }, [topProxies, trendingProxies]);

  // Apply search filter
  const searchFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allProxies;
    return allProxies.filter(
      (p) =>
        (p.displayName ?? "").toLowerCase().includes(q) ||
        (p.xHandle ?? "").toLowerCase().includes(q)
    );
  }, [allProxies, search]);

  // Apply category filter
  const filteredByCategory = useMemo(() => {
    if (category === "all") return searchFiltered;
    if (category === "top") return [...searchFiltered].sort((a, b) => (b.totalChats ?? 0) - (a.totalChats ?? 0));
    if (category === "trending") return [...searchFiltered].sort((a, b) => (b.priceChange24h ?? 0) - (a.priceChange24h ?? 0));
    return searchFiltered.filter((p) => p.categoryId === category);
  }, [searchFiltered, category]);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-white">Explore</h1>
        <div className="relative max-w-xs w-full">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray" />
          <Input
            placeholder="Search proxies..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <TabSection
        variant="compact"
        active={category}
        onChange={setCategory}
        categories={buildCategoryList(dbCategories)}
      />

      <div className="space-y-8">
        <ProxyRow
          title={category === "trending" ? "Trending" : "Top Proxies"}
          subtitle={category === "trending" ? "Rising fast this week" : "Most popular AI clones"}
          proxies={filteredByCategory}
        />
      </div>
    </div>
  );
}
