"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const TIME_RANGES = ["1D", "1W", "1M", "1Y"] as const;

export function PortfolioSection() {
  const [range, setRange] = useState<(typeof TIME_RANGES)[number]>("1D");

  const totalValue = "$0.06";
  const change = "0.00%";

  return (
    <div className="space-y-6 ">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-white text-3xl font-medium">My portfolio</h1>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-white text-5xl font-bold">{totalValue}</span>
            <span className="text-gray text-base">{change}</span>
          </div>
        </div>
        <div className="flex items-center gap-0.5 bg-white/4 rounded-lg p-0.5">
          {TIME_RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                "px-4 py-2 text-sm rounded-md cursor-pointer transition-colors",
                range === r
                  ? "bg-white/10 text-white"
                  : "text-gray hover:text-white"
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="relative h-[180px] w-full">
        <svg viewBox="0 0 600 120" className="w-full h-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(190, 242, 100)" stopOpacity="0.15" />
              <stop offset="100%" stopColor="rgb(190, 242, 100)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d="M0,90 Q50,88 100,85 T200,80 T300,75 T400,70 T500,65 T600,60 L600,120 L0,120 Z" fill="url(#chartGrad)" />
          <path d="M0,90 Q50,88 100,85 T200,80 T300,75 T400,70 T500,65 T600,60" fill="none" stroke="rgb(190, 242, 100)" strokeWidth="2" />
        </svg>
      </div>

      <div className="h-px bg-white/6" />

      <div className="flex items-center justify-between">
        <span className="text-white text-base font-medium">Total balance</span>
        <button className="flex items-center gap-1 text-white text-base cursor-pointer bg-transparent border-none">
          {totalValue} <ChevronDown size={16} className="text-gray" />
        </button>
      </div>

      <div className="h-px bg-white/6" />
    </div>
  );
}
