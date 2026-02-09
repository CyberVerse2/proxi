import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ProxyCard } from "@/components/proxy/proxy-card";
import type { Proxy } from "@/lib/db/schema";

interface TrendingProxiesProps {
  proxies: Proxy[];
}

export function TrendingProxies({ proxies }: TrendingProxiesProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-white font-semibold text-base">Trending proxies</h2>
        <Link
          href="/explore?category=trending"
          className="flex items-center gap-1 text-gray text-sm hover:text-white no-underline transition-colors"
        >
          Show more <ChevronRight size={16} />
        </Link>
      </div>

      <div className="flex gap-6 overflow-x-auto pb-2 scrollbar-none">
        {proxies.length > 0 ? (
          proxies.map((proxy) => (
            <ProxyCard key={proxy.id} proxy={proxy} />
          ))
        ) : (
          <p className="text-gray text-sm py-4">No trending proxies yet</p>
        )}
      </div>
    </div>
  );
}
