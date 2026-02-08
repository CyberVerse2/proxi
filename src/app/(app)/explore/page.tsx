import { getLiveProxies, getTrendingProxies } from "@/lib/db/queries";
import { ExplorePageClient } from "./explore-client";

export default async function ExplorePage() {
  const [top, trending] = await Promise.all([
    getLiveProxies(20),
    getTrendingProxies(20),
  ]);

  return <ExplorePageClient topProxies={top} trendingProxies={trending} />;
}
