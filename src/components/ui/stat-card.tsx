import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  change?: string;
  icon?: ReactNode;
  className?: string;
}

export function StatCard({ label, value, change, icon, className }: StatCardProps) {
  const isNegative = change?.startsWith("-");
  return (
    <div className={cn("rounded-xl bg-dark2 border border-white/[0.06] p-4", className)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray text-xs">{label}</span>
        {icon && <span className="text-gray">{icon}</span>}
      </div>
      <div className="flex items-end gap-2">
        <span className="text-white text-2xl font-bold">{value}</span>
        {change && (
          <span className={cn("text-xs font-medium mb-0.5", isNegative ? "text-red-400" : "text-emerald-400")}>
            {change}
          </span>
        )}
      </div>
    </div>
  );
}
