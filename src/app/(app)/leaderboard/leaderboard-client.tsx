"use client";

import { useMemo } from "react";
import { Trophy, Medal, Crown, Star, Ghost } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

interface LeaderboardEntry {
  rank: number;
  name: string;
  handle: string;
  avatar: string;
  points: number;
  tier: string;
  privyId: string;
}

const tierColors: Record<string, string> = {
  diamond: "text-cyan-400",
  gold: "text-yellow-400",
  silver: "text-gray",
  bronze: "text-amber-600",
};

const rankIcons = [Crown, Medal, Star];

interface Props {
  entries: LeaderboardEntry[];
}

export function LeaderboardClient({ entries }: Props) {
  const { user } = useAuth();

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const myEntry = useMemo(() => {
    if (!user?.id) return null;
    return entries.find((e) => e.privyId === user.id) ?? null;
  }, [entries, user?.id]);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white">Leaderboard</h1>
        <p className="text-gray text-sm mt-0.5">Top community members by points</p>
      </div>

      {/* Your stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard
          label="Your Rank"
          value={myEntry ? `#${myEntry.rank}` : "—"}
          icon={<Trophy size={16} />}
        />
        <StatCard
          label="Your Points"
          value={myEntry ? myEntry.points.toLocaleString() : "—"}
          icon={<Star size={16} />}
        />
        <StatCard
          label="Your Tier"
          value={myEntry ? myEntry.tier.charAt(0).toUpperCase() + myEntry.tier.slice(1) : "—"}
          icon={<Medal size={16} />}
        />
      </div>

      {/* Leaderboard table */}
      <Card>
        {entries.length === 0 ? (
          <div className="text-center py-12">
            <Ghost size={32} className="text-gray/30 mx-auto mb-2" />
            <p className="text-gray text-sm">No leaderboard entries yet</p>
            <p className="text-gray/60 text-xs mt-1">Earn points by creating proxies and chatting</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray text-xs border-b border-white/6">
                  <th className="text-left pb-3 font-medium w-12">Rank</th>
                  <th className="text-left pb-3 font-medium">User</th>
                  <th className="text-right pb-3 font-medium">Points</th>
                  <th className="text-right pb-3 font-medium">Tier</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const RankIcon = entry.rank <= 3 ? rankIcons[entry.rank - 1] : null;
                  const isMe = user?.id === entry.privyId;
                  return (
                    <tr
                      key={entry.rank}
                      className={cn(
                        "border-b border-white/3 hover:bg-white/2",
                        isMe && "bg-lime/5"
                      )}
                    >
                      <td className="py-3">
                        {RankIcon ? (
                          <RankIcon
                            size={18}
                            className={
                              entry.rank === 1
                                ? "text-yellow-400"
                                : entry.rank === 2
                                ? "text-gray"
                                : "text-amber-600"
                            }
                          />
                        ) : (
                          <span className="text-gray text-xs">#{entry.rank}</span>
                        )}
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={entry.avatar}
                            alt={entry.name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                          <div>
                            <span className="text-white font-medium text-[13px]">
                              {entry.name}
                              {isMe && (
                                <span className="text-lime text-[11px] ml-1.5">(you)</span>
                              )}
                            </span>
                            <span className="text-gray text-xs block">@{entry.handle}</span>
                          </div>
                        </div>
                      </td>
                      <td className="text-right text-white font-medium">
                        {entry.points.toLocaleString()}
                      </td>
                      <td className="text-right">
                        <Badge className={cn("capitalize", tierColors[entry.tier])}>
                          {entry.tier}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
