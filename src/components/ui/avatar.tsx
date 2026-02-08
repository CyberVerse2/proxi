import { cn } from "@/lib/utils";
import { Zap } from "lucide-react";

interface AvatarProps {
  src?: string | null;
  alt?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeMap = { xs: "w-6 h-6", sm: "w-8 h-8", md: "w-10 h-10", lg: "w-14 h-14", xl: "w-20 h-20" };
const iconSizes = { xs: 10, sm: 13, md: 16, lg: 22, xl: 32 };

export function Avatar({ src, alt = "", size = "md", className }: AvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        className={cn("rounded-full object-cover flex-shrink-0", sizeMap[size], className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "rounded-full flex-shrink-0 flex items-center justify-center bg-dark3 border border-white/10 group",
        sizeMap[size],
        className
      )}
    >
      <Zap
        size={iconSizes[size]}
        strokeWidth={1.5}
        className="text-gray/40 group-hover:text-lime transition-colors duration-300"
        fill="currentColor"
      />
    </div>
  );
}
