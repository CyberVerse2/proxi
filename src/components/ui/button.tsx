"use client";

import { cn } from "@/lib/utils";
import { forwardRef, type ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
}

const variants = {
  primary:
    "bg-lime text-black font-bold hover:brightness-110 active:scale-[0.97]",
  secondary:
    "bg-white/[0.06] text-white border border-white/[0.08] hover:bg-white/[0.10] active:scale-[0.97]",
  ghost:
    "bg-transparent text-gray hover:text-white hover:bg-white/[0.04] active:scale-[0.97]",
  outline:
    "bg-transparent text-white border border-white/[0.12] hover:bg-white/[0.04] active:scale-[0.97]",
};

const sizes = {
  sm: "h-9 px-5 text-[13px] rounded-full",
  md: "h-11 px-7 text-sm rounded-full",
  lg: "h-12 px-8 text-[15px] rounded-full",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 transition-all duration-150 cursor-pointer whitespace-nowrap font-medium",
        variants[variant],
        sizes[size],
        "disabled:opacity-40 disabled:pointer-events-none",
        className
      )}
      {...props}
    />
  )
);
Button.displayName = "Button";
