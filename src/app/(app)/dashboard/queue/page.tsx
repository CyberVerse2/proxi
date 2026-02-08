"use client";

import { useState, useEffect, useCallback } from "react";
import { MessageSquare, Send, SkipForward, Clock, Ghost } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";

interface QueueItem {
  id: string;
  proxyId: string;
  messageId: string;
  question: string;
  answer: string | null;
  status: "pending" | "answered" | "skipped";
  createdAt: string;
  answeredAt: string | null;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function QueuePage() {
  const { user, authenticated, ready } = useAuth();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");

  const fetchQueue = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await fetch(`/api/queue?privyId=${encodeURIComponent(user.id)}`);
      if (res.ok) {
        const data = await res.json();
        setQueue(Array.isArray(data) ? data : []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    if (!ready) return;
    if (!authenticated || !user?.id) { setLoading(false); return; }
    fetchQueue();
  }, [ready, authenticated, user?.id, fetchQueue]);

  const handleAnswer = async (id: string) => {
    if (!answer.trim()) return;
    const res = await fetch("/api/queue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, answer: answer.trim() }),
    });
    if (res.ok) {
      setQueue((prev) => prev.filter((q) => q.id !== id));
      setAnswer("");
      setActiveId(null);
    }
  };

  const handleSkip = async (id: string) => {
    const res = await fetch("/api/queue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "skip" }),
    });
    if (res.ok) {
      setQueue((prev) => prev.filter((q) => q.id !== id));
    }
  };

  const pending = queue.filter((q) => q.status === "pending");
  const answered = queue.filter((q) => q.status === "answered");

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Question Queue</h1>
        <p className="text-gray text-sm mt-0.5">
          Questions your proxy couldn&apos;t confidently answer. Provide real answers to improve its knowledge.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Badge variant="lime">
          <Clock size={12} /> {pending.length} pending
        </Badge>
        <Badge>{answered.length} answered</Badge>
      </div>

      {loading ? (
        <Card className="text-center py-12">
          <div className="w-8 h-8 border-2 border-lime/30 border-t-lime rounded-full animate-spin mx-auto mb-2" />
          <p className="text-gray text-xs">Loading queue...</p>
        </Card>
      ) : !authenticated ? (
        <Card className="text-center py-12">
          <Ghost size={32} className="text-gray/30 mx-auto mb-2" />
          <p className="text-gray text-sm">Sign in to view your question queue</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {pending.length === 0 ? (
            <Card className="text-center py-12">
              <MessageSquare size={32} className="text-gray/30 mx-auto mb-2" />
              <p className="text-gray text-sm">No pending questions</p>
              <p className="text-gray/60 text-xs mt-1">Your proxy is handling everything well</p>
            </Card>
          ) : (
            pending.map((item) => (
              <Card key={item.id} className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-white text-sm font-medium">&ldquo;{item.question}&rdquo;</p>
                    <p className="text-gray text-xs">{timeAgo(item.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button variant="ghost" size="sm" onClick={() => handleSkip(item.id)}>
                      <SkipForward size={14} /> Skip
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setActiveId(activeId === item.id ? null : item.id)}
                    >
                      <MessageSquare size={14} /> Answer
                    </Button>
                  </div>
                </div>

                {activeId === item.id && (
                  <div className="flex gap-2 pt-2 border-t border-white/6">
                    <textarea
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      placeholder="Type your answer..."
                      className="flex-1 bg-white/4 border border-white/6 rounded-lg p-3 text-white text-sm placeholder:text-gray/50 resize-none outline-none focus:border-lime/30 min-h-[80px]"
                    />
                    <Button size="sm" onClick={() => handleAnswer(item.id)} className="self-end">
                      <Send size={14} /> Submit
                    </Button>
                  </div>
                )}
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
