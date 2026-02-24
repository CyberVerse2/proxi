"use client";

import Image from "next/image";
import Link from "next/link";

export function SidebarRow({
  name,
  avatar,
  price,
  change,
  href
}: {
  name: string;
  avatar: string;
  price: number;
  change: number;
  href?: string;
}) {
  const content = (
    <div className="flex items-center justify-between py-1.5 group">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 border border-white/6">
          <Image src={avatar} alt={name} width={36} height={36} className="object-cover w-full h-full" />
        </div>
        <span className="text-white text-sm font-medium truncate group-hover:text-lime transition-colors">{name}</span>
      </div>
      <div className="text-right shrink-0 ml-3">
        <span className="text-white text-sm block">${price.toFixed(2)}</span>
        <span className="text-gray text-xs">
          {change >= 0 ? "+" : ""}
          {change.toFixed(2)}%
        </span>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="no-underline block">
        {content}
      </Link>
    );
  }
  return content;
}
