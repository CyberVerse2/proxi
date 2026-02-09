"use client";

import { useState, useEffect, useCallback } from "react";
import { MessageSquare, Plus, PanelRightClose, PanelRightOpen } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface ConversationItem {
  id: string;
  title: string | null;
  updatedAt: string;
  totalMessages: number;
}

interface ChatHistoryProps {
  proxyHandle: string;
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  /** Increment to force a refresh of the conversation list */
  refreshKey?: number;
}

/** Group conversations by relative time bucket */
function groupByTime(conversations: ConversationItem[]) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400_000);
  const sevenDaysAgo = new Date(today.getTime() - 7 * 86400_000);
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 86400_000);

  const groups: { label: string; items: ConversationItem[] }[] = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "Previous 7 days", items: [] },
    { label: "Previous 30 days", items: [] },
    { label: "Older", items: [] },
  ];

  for (const c of conversations) {
    const d = new Date(c.updatedAt);
    if (d >= today) groups[0].items.push(c);
    else if (d >= yesterday) groups[1].items.push(c);
    else if (d >= sevenDaysAgo) groups[2].items.push(c);
    else if (d >= thirtyDaysAgo) groups[3].items.push(c);
    else groups[4].items.push(c);
  }

  return groups.filter((g) => g.items.length > 0);
}

export function ChatHistory({
  proxyHandle,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  refreshKey = 0,
}: ChatHistoryProps) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(true);

  const fetchConversations = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/chat/history?privyId=${encodeURIComponent(user.id)}&proxyHandle=${encodeURIComponent(proxyHandle)}`
      );
      if (!res.ok) throw new Error("Failed to load history");
      const data = await res.json();
      setConversations(data.conversations ?? []);
    } catch {
      // Silently fail — history panel will just be empty
    } finally {
      setLoading(false);
    }
  }, [user?.id, proxyHandle]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Refresh the list whenever the active conversation changes (new convo was created)
  useEffect(() => {
    if (activeConversationId) {
      fetchConversations();
    }
  }, [activeConversationId, fetchConversations]);

  // Refresh when the parent signals a message was completed
  useEffect(() => {
    if (refreshKey > 0) {
      fetchConversations();
    }
  }, [refreshKey, fetchConversations]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="absolute top-4 right-2 z-30 p-2 rounded-lg bg-white/8 border border-white/10 text-white/60 hover:text-white hover:bg-white/12 transition-colors cursor-pointer"
        title="Open chat history"
      >
        <PanelRightOpen size={16} />
      </button>
    );
  }

  const groups = groupByTime(conversations);

  return (
    <div className="w-[280px] shrink-0 h-full flex flex-col bg-black/60 backdrop-blur-xl border-l border-white/8 z-20 relative">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/8">
        <span className="text-white/70 text-sm font-semibold uppercase tracking-wider">
          Chats
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onNewChat}
            className="p-2 rounded-md text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="New chat"
          >
            <Plus size={17} />
          </button>
          <button
            onClick={() => setOpen(false)}
            className="p-2 rounded-md text-white/50 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Close panel"
          >
            <PanelRightClose size={17} />
          </button>
        </div>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto scrollbar-none px-2.5 py-2.5 space-y-3">
        {loading && conversations.length === 0 && (
          <div className="flex items-center justify-center py-8">
            <div className="w-5 h-5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
          </div>
        )}

        {!loading && conversations.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MessageSquare size={24} className="text-white/20 mb-2" />
            <p className="text-white/30 text-sm">No conversations yet</p>
          </div>
        )}

        {groups.map((group) => (
          <div key={group.label}>
            <p className="text-white/30 text-xs font-semibold uppercase tracking-wider px-2.5 mb-1.5">
              {group.label}
            </p>
            {group.items.map((convo) => (
              <button
                key={convo.id}
                onClick={() => onSelectConversation(convo.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-base transition-colors cursor-pointer mb-0.5 ${
                  convo.id === activeConversationId
                    ? "bg-white/12 text-white"
                    : "text-white/60 hover:bg-white/6 hover:text-white/80"
                }`}
              >
                <span className="block truncate text-sm leading-snug">
                  {convo.title || "New conversation"}
                </span>
                <span className="block text-xs text-white/30 mt-0.5">
                  {convo.totalMessages} message{convo.totalMessages !== 1 ? "s" : ""}
                </span>
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
