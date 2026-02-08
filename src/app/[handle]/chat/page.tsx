"use client";

import { useParams } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { ArrowUp, Square, Zap } from "lucide-react";
import { useChat } from "@/hooks/use-chat";
import { cn } from "@/lib/utils";

export default function ChatPage() {
  const { handle } = useParams<{ handle: string }>();
  const { messages, isLoading, sendMessage, stop } = useChat({ proxyHandle: handle });
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    setInput("");
    sendMessage(trimmed);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-3 border-b border-white/[0.06]">
        <img src="/mock-avatar.jpg" alt={handle} className="w-8 h-8 rounded-full object-cover" />
        <div>
          <span className="text-white text-sm font-semibold">{handle}</span>
          <span className="text-gray text-xs ml-2">AI Proxy</span>
        </div>
        <span className="ml-auto flex items-center gap-1 text-[11px] text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          Online
        </span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-3 opacity-60">
            <Zap size={32} className="text-lime" />
            <p className="text-gray text-sm">Start chatting with @{handle}&apos;s AI proxy</p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex",
              msg.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                msg.role === "user"
                  ? "bg-lime text-black rounded-br-md"
                  : "bg-dark2 text-white border border-white/[0.06] rounded-bl-md"
              )}
            >
              {msg.content || (
                <span className="inline-flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray animate-blink" />
                  <span className="w-1.5 h-1.5 rounded-full bg-gray animate-blink [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-gray animate-blink [animation-delay:0.4s]" />
                </span>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <form onSubmit={handleSubmit} className="px-6 pb-4 pt-2">
        <div className="flex items-center gap-2 bg-dark2 border border-white/[0.06] rounded-2xl px-4 py-2 focus-within:border-lime/30 transition-colors">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask @${handle} anything...`}
            className="flex-1 bg-transparent text-white text-sm placeholder:text-gray/50 outline-none"
          />
          {isLoading ? (
            <button type="button" onClick={stop} className="p-1.5 rounded-full bg-red-500/20 text-red-400 cursor-pointer">
              <Square size={14} />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="p-1.5 rounded-full bg-lime text-black disabled:opacity-30 cursor-pointer"
            >
              <ArrowUp size={14} />
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
