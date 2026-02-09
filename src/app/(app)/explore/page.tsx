import { getLiveProxies, getTrendingProxies, getAllCategories } from "@/lib/db/queries";
import { ExplorePageClient } from "./explore-client";

export default async function ExplorePage() {
  const [top, trending, dbCategories] = await Promise.all([
    getLiveProxies(20),
    getTrendingProxies(20),
    getAllCategories(),
  ]);

  return (
    <ExplorePageClient
      topProxies={top}
      trendingProxies={trending}
      dbCategories={dbCategories}
    />
  );
}
