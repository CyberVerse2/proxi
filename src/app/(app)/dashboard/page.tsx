import { getTrendingProxies, getTopProxies, getNewestProxies } from "@/lib/db/queries";
import { PortfolioSection } from "./portfolio-section";
import { TrendingProxies } from "./trending-proxies";
import { TopNewProxies } from "./top-new-proxies";
import {
  LeaderboardWidget,
  HoldingsWidget,
  WatchlistWidget,
} from "./sidebar-widgets";

export default async function DashboardPage() {
  const [trending, topNew, newest] = await Promise.all([
    getTrendingProxies(8),
    getTopProxies(8),
    getNewestProxies(8),
  ]);

  return (
    <div className="p-6 md:p-8 pt-8 flex justify-center">
      <div className="flex gap-8 w-full max-w-[1200px]">
        {/* Main column */}
        <div className="flex-1 min-w-0 space-y-8">
          <PortfolioSection />

          <TrendingProxies proxies={trending} />

          <TopNewProxies
            proxies={topNew}
            title="Top new proxies this week"
          />

          <TopNewProxies
            proxies={newest}
            title="New proxies"
            subtitle="Recently launched on Proxi"
          />
        </div>

        {/* Sidebar */}
        <div className="hidden lg:flex flex-col gap-4 w-[300px] shrink-0">
          <LeaderboardWidget />
          <HoldingsWidget />
          <WatchlistWidget />
        </div>
      </div>
    </div>
  );
}
