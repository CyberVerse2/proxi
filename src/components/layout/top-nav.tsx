"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export function TopNav() {
  const { authenticated, login, xHandle } = useAuth();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-20 px-6 flex items-center justify-between bg-black/80 backdrop-blur-md border-b border-white/6">
      {/* Left: logo */}
      <Link href="/" className="flex items-center gap-1 no-underline">
        <Image src="/tools/proxi-logo.png" alt="Proxi" width={60} height={60} className="shrink-0" />
        <span className="font-heading text-white text-2xl tracking-tight">proxi</span>
      </Link>

     
      {/* Right: actions */}
      <div className="flex items-center gap-2.5">
        {authenticated ? (
          <>
            <Link href="/explore">
              <Button variant="secondary" size="sm">Explore</Button>
            </Link>
            <Link href={`/${xHandle ?? "dashboard"}`}>
              <Button size="sm">Dashboard</Button>
            </Link>
          </>
        ) : (
          <>
            <Button variant="ghost" size="sm" onClick={login}>Log in</Button>
            <Button size="sm" onClick={login}>Get Started</Button>
          </>
        )}
      </div>
    </nav>
  );
}
