"use client";

import Link from "next/link";
import { ChevronRight, Ghost } from "lucide-react";
import { ProxyCard, ProxyCardSkeleton } from "@/components/proxy/proxy-card";
import type { Proxy } from "@/lib/db/schema";

interface ProxyRowProps {
  title: string;
  subtitle?: string;
  proxies: Proxy[];
  seeAllHref?: string;
  loading?: boolean;
  /** Hide header when parent TabSection shows See all (e.g. landing page) */
  hideHeader?: boolean;
}

export function ProxyRow({ title, subtitle, proxies, seeAllHref, loading, hideHeader }: ProxyRowProps) {
  return (
    <section className="space-y-3 w-full">
      {/* Header - hidden when TabSection provides it */}
      {!hideHeader && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white font-semibold text-lg">{title}</h2>
            {subtitle && <p className="text-gray text-xs mt-0.5">{subtitle}</p>}
          </div>
          {seeAllHref && (
            <Link
              href={seeAllHref}
              className="flex items-center gap-1 text-gray text-xs hover:text-white transition-colors no-underline"
            >
              See all <ChevronRight size={14} />
            </Link>
          )}
        </div>
      )}

      {/* Cards or empty state */}
      {loading ? (
        <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-none w-full">
          {Array.from({ length: 8 }).map((_, i) => <ProxyCardSkeleton key={i} />)}
        </div>
      ) : proxies.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/6 flex items-center justify-center mb-4">
            <Ghost size={24} className="text-gray/50" />
          </div>
          <p className="text-gray text-sm font-medium">No proxies found</p>
          <p className="text-gray/50 text-xs mt-1 max-w-[240px]">
            There are no proxies in this category yet. Check back soon!
          </p>
        </div>
      ) : (
        <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-none w-full">
          {proxies.map((p) => <ProxyCard key={p.id} proxy={p} />)}
        </div>
      )}
    </section>
  );
}
