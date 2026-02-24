"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export function LeaderboardWidget() {
  const { user, authenticated, ready } = useAuth();
  const [rank, setRank] = useState<number | null>(null);
  const [points, setPoints] = useState<number | null>(null);

  useEffect(() => {
    if (!ready || !authenticated || !user?.id) return;
    fetch(`/api/leaderboard?privyId=${encodeURIComponent(user.id)}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          const me = data.find(
            (e: { leaderboard: { userId: string } }) => e.leaderboard?.userId === user?.id
          );
          if (me) {
            setRank(me.leaderboard?.rank ?? null);
            setPoints(me.leaderboard?.points ?? 0);
          }
        }
      })
      .catch(() => {});
  }, [ready, authenticated, user?.id]);

  return (
    <Card className="space-y-4">
      <div>
        <h3 className="text-white font-semibold text-base">Leaderboard</h3>
        <p className="text-gray text-xs mt-0.5">Earn points by being a user of Proxi.</p>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-gray text-sm">Rank</span>
          <span className="text-white text-base font-semibold">{rank ? `#${rank}` : "—"}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray text-sm">Points earned</span>
          <span className="text-white text-base font-semibold">
            {points !== null ? points.toLocaleString() : "—"}
          </span>
        </div>
      </div>
      <Link href="/leaderboard" className="block no-underline">
        <Button variant="outline" size="sm" className="w-full rounded-lg text-sm">
          Go to leaderboard
        </Button>
      </Link>
    </Card>
  );
}
