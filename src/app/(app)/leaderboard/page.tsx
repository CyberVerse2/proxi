import { getLeaderboard } from "@/lib/db/queries";
import { LeaderboardClient } from "./leaderboard-client";
import { DEFAULT_AVATAR } from "@/lib/config/constants";

export default async function LeaderboardPage() {
  const data = await getLeaderboard(50);

  const entries = data.map((d, i) => ({
    rank: d.leaderboard.rank ?? i + 1,
    name: d.user.displayName ?? d.user.xHandle ?? "Anonymous",
    handle: d.user.xHandle ?? "",
    avatar: d.user.xProfileImageUrl ?? DEFAULT_AVATAR,
    points: d.leaderboard.points,
    tier: d.leaderboard.tier,
    privyId: d.user.privyId,
  }));

  return <LeaderboardClient entries={entries} />;
}
