"use client";

import { useEffect, useState } from "react";
import { TrendingUp, MessageSquare, Users, Eye } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { useAuth } from "@/hooks/use-auth";

interface Stats {
  totalChats: number;
  totalMessages: number;
  uniqueUsers: number;
  watchlisters: number;
}

export function DashboardStats() {
  const { user, authenticated, ready } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    if (!ready || !authenticated || !user?.id) return;

    fetch(`/api/dashboard/stats?privyId=${encodeURIComponent(user.id)}`)
      .then((r) => r.json())
      .then((data) => setStats(data))
      .catch(() => {});
  }, [ready, authenticated, user?.id]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <StatCard
        label="Total Earnings"
        value="$0"
        change="—"
        icon={<TrendingUp size={16} />}
      />
      <StatCard
        label="Total Chats"
        value={stats ? stats.totalChats.toLocaleString() : "—"}
        icon={<MessageSquare size={16} />}
      />
      <StatCard
        label="Unique Users"
        value={stats ? stats.uniqueUsers.toLocaleString() : "—"}
        icon={<Users size={16} />}
      />
      <StatCard
        label="Watchlisters"
        value={stats ? stats.watchlisters.toLocaleString() : "—"}
        icon={<Eye size={16} />}
      />
    </div>
  );
}
