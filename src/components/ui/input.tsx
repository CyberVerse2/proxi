import { cn } from "@/lib/utils";
import { forwardRef, type InputHTMLAttributes } from "react";

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "h-10 w-full rounded-lg bg-white/[0.04] border border-white/[0.06] px-3.5 text-sm text-white",
      "placeholder:text-gray/50 focus:outline-none focus:border-lime/30 transition-colors",
      className
    )}
    {...props}
  />
));
Input.displayName = "Input";
