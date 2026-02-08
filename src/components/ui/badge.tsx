import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "lime" | "outline";
}

const variants = {
  default: "bg-white/[0.06] text-gray border border-white/[0.06]",
  lime: "bg-lime/10 text-lime border border-lime/20",
  outline: "bg-transparent text-gray border border-white/[0.12]",
};

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
