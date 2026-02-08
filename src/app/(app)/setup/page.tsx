"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ArrowRight, ArrowLeft, Check, Mic, Brain, Lock, Cog, MessageSquare, Loader2, Upload, Sparkles, Send, ArrowUp, Square, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useChat } from "@/hooks/use-chat";
import type { Proxy } from "@/lib/db/schema";

const STEPS = [
  { id: 1, label: "Voice", icon: Mic, description: "We'll analyze your X posts to capture your unique voice and writing style." },
  { id: 2, label: "Knowledge", icon: Brain, description: "Review and customize your proxy's knowledge map, beliefs, and opinions." },
  { id: 3, label: "Private Data", icon: Lock, description: "Optionally add private notes, FAQs, or context only you would know." },
  { id: 4, label: "Config", icon: Cog, description: "Set your proxy's pricing, visibility, and behavior preferences." },
  { id: 5, label: "Test Chat", icon: MessageSquare, description: "Chat with your proxy to test it before going live." },
];

export default function SetupPage() {
  const { user, xHandle, ready, authenticated } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [proxy, setProxy] = useState<Proxy | null>(null);
  const [loading, setLoading] = useState(true);

  // Load existing proxy data
  useEffect(() => {
    if (!ready || !authenticated || !user?.id) { setLoading(false); return; }
    fetch(`/api/user/me?privyId=${encodeURIComponent(user.id)}`)
      .then((r) => r.json())
      .then((data) => { if (data.proxy) setProxy(data.proxy); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [ready, authenticated, user?.id]);

  const refreshProxy = useCallback(async () => {
    if (!user?.id) return null;
    const res = await fetch(`/api/user/me?privyId=${encodeURIComponent(user.id)}`);
    const data = await res.json();
    if (data.proxy) { setProxy(data.proxy); return data.proxy; }
    return null;
  }, [user?.id]);

  const step = STEPS[currentStep - 1];

  if (loading) {
    return (
      <div className="p-6 md:p-8 flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-lime/30 border-t-lime rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Setup Wizard</h1>
        <p className="text-gray text-sm mt-0.5">Create and configure your AI proxy in 5 steps</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            <button
              onClick={() => setCurrentStep(s.id)}
              className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center text-xs font-medium transition-colors cursor-pointer",
                currentStep === s.id
                  ? "bg-lime text-black"
                  : currentStep > s.id
                  ? "bg-lime/20 text-lime"
                  : "bg-white/6 text-gray"
              )}
            >
              {currentStep > s.id ? <Check size={14} /> : s.id}
            </button>
            {i < STEPS.length - 1 && (
              <div className={cn("w-8 h-[2px] rounded-full", currentStep > s.id ? "bg-lime/30" : "bg-white/6")} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <Card className="min-h-[300px] space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-lime/10 flex items-center justify-center">
            <step.icon size={20} className="text-lime" />
          </div>
          <div>
            <h2 className="text-white font-semibold">{step.label}</h2>
            <p className="text-gray text-xs">{step.description}</p>
          </div>
        </div>

        {currentStep === 1 && (
          <VoiceStep
            xHandle={xHandle}
            privyId={user?.id ?? null}
            proxy={proxy}
            onComplete={async () => { await refreshProxy(); setCurrentStep(2); }}
          />
        )}
        {currentStep === 2 && (
          <KnowledgeStep proxy={proxy} privyId={user?.id ?? null} onRefresh={refreshProxy} />
        )}
        {currentStep === 3 && (
          <PrivateDataStep proxy={proxy} />
        )}
        {currentStep === 4 && (
          <ConfigStep proxy={proxy} privyId={user?.id ?? null} onRefresh={refreshProxy} />
        )}
        {currentStep === 5 && (
          <TestChatStep proxy={proxy} privyId={user?.id ?? null} onRefresh={refreshProxy} />
        )}
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
          disabled={currentStep === 1}
        >
          <ArrowLeft size={16} /> Back
        </Button>
        {currentStep < STEPS.length ? (
          <Button onClick={() => setCurrentStep(Math.min(STEPS.length, currentStep + 1))}>
            Next <ArrowRight size={16} />
          </Button>
        ) : null}
      </div>
    </div>
  );
}

/* ===================== Step 1: Voice Analysis ===================== */

function VoiceStep({
  xHandle,
  privyId,
  proxy,
  onComplete,
}: {
  xHandle: string | null;
  privyId: string | null;
  proxy: Proxy | null;
  onComplete: () => void;
}) {
  const [status, setStatus] = useState<"idle" | "analyzing" | "done" | "error">(
    proxy?.voiceProfile ? "done" : "idle"
  );
  const [error, setError] = useState("");

  const startAnalysis = async () => {
    if (!privyId || !xHandle) return;
    setStatus("analyzing");
    setError("");

    try {
      const res = await fetch("/api/proxy/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ privyId, xHandle }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to start analysis");
      }

      // Poll for completion
      const poll = setInterval(async () => {
        try {
          const meRes = await fetch(`/api/user/me?privyId=${encodeURIComponent(privyId)}`);
          const meData = await meRes.json();
          if (meData.proxy?.voiceProfile || meData.proxy?.status === "live") {
            clearInterval(poll);
            setStatus("done");
          }
        } catch { /* keep polling */ }
      }, 5000);

      // Timeout after 10 minutes
      setTimeout(() => {
        clearInterval(poll);
        if (status === "analyzing") {
          setStatus("done"); // Assume it finished even if we missed the update
        }
      }, 600_000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setStatus("error");
    }
  };

  if (!xHandle) {
    return (
      <div className="text-center py-8">
        <p className="text-gray text-sm">Connect your X account first to analyze your voice.</p>
        <p className="text-gray/50 text-xs mt-1">Go to Settings to connect your X account.</p>
      </div>
    );
  }

  const voiceProfile = proxy?.voiceProfile as Record<string, unknown> | null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-3 rounded-lg bg-white/4 border border-white/6">
        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-lime font-bold text-sm">
          @
        </div>
        <div>
          <p className="text-white text-sm font-medium">@{xHandle}</p>
          <p className="text-gray text-xs">Your X posts will be analyzed</p>
        </div>
      </div>

      {status === "idle" && (
        <Button onClick={startAnalysis} className="w-full">
          <Sparkles size={16} /> Analyze My Voice
        </Button>
      )}

      {status === "analyzing" && (
        <div className="text-center py-6 space-y-3">
          <Loader2 size={32} className="text-lime animate-spin mx-auto" />
          <p className="text-white text-sm font-medium">Analyzing your voice...</p>
          <p className="text-gray text-xs">
            Fetching your tweets, building voice profile, and creating embeddings.
            This takes 2-5 minutes.
          </p>
        </div>
      )}

      {status === "done" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-emerald-400 text-sm">
            <Check size={16} /> Voice analysis complete
          </div>
          {voiceProfile && (
            <div className="p-3 rounded-lg bg-white/4 border border-white/6 text-xs text-gray space-y-1">
              {Object.entries(voiceProfile).slice(0, 5).map(([key, val]) => (
                <p key={key}>
                  <span className="text-white capitalize">{key.replace(/_/g, " ")}:</span>{" "}
                  {typeof val === "string" ? val : JSON.stringify(val)}
                </p>
              ))}
            </div>
          )}
          <Button onClick={onComplete} className="w-full">
            Continue <ArrowRight size={14} />
          </Button>
        </div>
      )}

      {status === "error" && (
        <div className="space-y-3">
          <p className="text-red-400 text-sm">{error}</p>
          <Button variant="outline" onClick={startAnalysis}>Retry</Button>
        </div>
      )}
    </div>
  );
}

/* ===================== Step 2: Knowledge Review ===================== */

function KnowledgeStep({
  proxy,
  privyId,
  onRefresh,
}: {
  proxy: Proxy | null;
  privyId: string | null;
  onRefresh: () => Promise<Proxy | null>;
}) {
  const coreBrain = (proxy?.coreBrain as Record<string, unknown>) ?? {};
  const [editing, setEditing] = useState(false);
  const [brainText, setBrainText] = useState(JSON.stringify(coreBrain, null, 2));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!privyId) return;
    setSaving(true);
    try {
      const parsed = JSON.parse(brainText);
      await fetch("/api/proxy", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ privyId, coreBrain: parsed }),
      });
      await onRefresh();
      setEditing(false);
    } catch { /* invalid JSON */ }
    setSaving(false);
  };

  if (!proxy) {
    return (
      <div className="text-center py-8">
        <p className="text-gray text-sm">Complete voice analysis first to generate knowledge.</p>
      </div>
    );
  }

  const entries = Object.entries(coreBrain);

  return (
    <div className="space-y-4">
      {entries.length === 0 && !editing ? (
        <div className="text-center py-6">
          <Brain size={32} className="text-gray/30 mx-auto mb-2" />
          <p className="text-gray text-sm">No knowledge data yet</p>
          <p className="text-gray/50 text-xs mt-1">Run voice analysis to generate your proxy&apos;s brain</p>
        </div>
      ) : !editing ? (
        <div className="space-y-2">
          {entries.map(([key, val]) => (
            <div key={key} className="p-3 rounded-lg bg-white/4 border border-white/6">
              <p className="text-white text-xs font-medium capitalize mb-1">{key.replace(/_/g, " ")}</p>
              <p className="text-gray text-xs">
                {typeof val === "string" ? val : JSON.stringify(val)}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <textarea
          value={brainText}
          onChange={(e) => setBrainText(e.target.value)}
          className="w-full h-64 bg-white/4 border border-white/6 rounded-lg p-3 text-white text-xs font-mono resize-none outline-none focus:border-lime/30"
        />
      )}

      <div className="flex gap-2">
        {editing ? (
          <>
            <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save
            </Button>
          </>
        ) : (
          <Button variant="outline" onClick={() => { setBrainText(JSON.stringify(coreBrain, null, 2)); setEditing(true); }}>
            Edit Knowledge
          </Button>
        )}
      </div>
    </div>
  );
}

/* ===================== Step 3: Private Data Upload ===================== */

function PrivateDataStep({ proxy }: { proxy: Proxy | null }) {
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState<string[]>([]);

  const handleUpload = async () => {
    if (!proxy?.id || !text.trim()) return;
    setUploading(true);
    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proxyId: proxy.id,
          chunks: [{
            text: text.trim(),
            contentType: "private_note",
            priority: 10,
            qualityScore: 1.0,
          }],
        }),
      });
      if (res.ok) {
        setUploaded((prev) => [...prev, text.trim().slice(0, 60) + (text.length > 60 ? "..." : "")]);
        setText("");
      }
    } catch { /* ignore */ }
    setUploading(false);
  };

  if (!proxy) {
    return (
      <div className="text-center py-8">
        <p className="text-gray text-sm">Complete voice analysis first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-gray text-xs">
        Add private notes, FAQs, or context that isn&apos;t on your public X profile.
        This data improves your proxy&apos;s responses.
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Example: I'm a software engineer at Acme Corp. I specialize in React and TypeScript. My favorite programming language is Rust..."
        className="w-full h-32 bg-white/4 border border-white/6 rounded-lg p-3 text-white text-sm placeholder:text-gray/50 resize-none outline-none focus:border-lime/30"
      />

      <Button onClick={handleUpload} disabled={uploading || !text.trim()} className="w-full">
        {uploading ? (
          <><Loader2 size={14} className="animate-spin" /> Uploading...</>
        ) : (
          <><Upload size={14} /> Add to Knowledge Base</>
        )}
      </Button>

      {uploaded.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-gray text-xs font-medium">Uploaded notes:</p>
          {uploaded.map((note, i) => (
            <div key={i} className="flex items-center gap-2 text-xs text-gray p-2 rounded bg-white/4 border border-white/6">
              <Check size={12} className="text-emerald-400 shrink-0" />
              {note}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ===================== Step 4: Config ===================== */

function ConfigStep({
  proxy,
  privyId,
  onRefresh,
}: {
  proxy: Proxy | null;
  privyId: string | null;
  onRefresh: () => Promise<Proxy | null>;
}) {
  const [price, setPrice] = useState(proxy?.price?.toString() ?? "0");
  const [ticker, setTicker] = useState(proxy?.ticker ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!privyId) return;
    setSaving(true);
    setSaved(false);
    try {
      await fetch("/api/proxy", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          privyId,
          price: parseFloat(price) || 0,
          ticker: ticker.trim().toUpperCase() || null,
        }),
      });
      await onRefresh();
      setSaved(true);
    } catch { /* ignore */ }
    setSaving(false);
  };

  if (!proxy) {
    return (
      <div className="text-center py-8">
        <p className="text-gray text-sm">Complete voice analysis first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-gray text-xs mb-1.5 block">Chat Price (USD per message)</label>
        <Input
          type="number"
          step="0.01"
          min="0"
          value={price}
          onChange={(e) => { setPrice(e.target.value); setSaved(false); }}
          placeholder="0.00"
        />
        <p className="text-gray/50 text-[11px] mt-1">Set to 0 for free chats</p>
      </div>

      <div>
        <label className="text-gray text-xs mb-1.5 block">Ticker Symbol</label>
        <Input
          value={ticker}
          onChange={(e) => { setTicker(e.target.value); setSaved(false); }}
          placeholder="e.g. PROXI"
          maxLength={10}
        />
        <p className="text-gray/50 text-[11px] mt-1">Used when your proxy token is deployed</p>
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? (
          <><Loader2 size={14} className="animate-spin" /> Saving...</>
        ) : saved ? (
          <><Check size={14} /> Saved</>
        ) : (
          <><Cog size={14} /> Save Configuration</>
        )}
      </Button>
    </div>
  );
}

/* ===================== Step 5: Test Chat ===================== */

function TestChatStep({
  proxy,
  privyId,
  onRefresh,
}: {
  proxy: Proxy | null;
  privyId: string | null;
  onRefresh: () => Promise<Proxy | null>;
}) {
  const handle = proxy?.xHandle ?? "";
  const { messages, isLoading, sendMessage, stop } = useChat({ proxyHandle: handle });
  const [input, setInput] = useState("");
  const [launching, setLaunching] = useState(false);
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

  const handleLaunch = async () => {
    if (!privyId) return;
    setLaunching(true);
    try {
      await fetch("/api/proxy", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ privyId, status: "live" }),
      });
      await onRefresh();
    } catch { /* ignore */ }
    setLaunching(false);
  };

  if (!proxy) {
    return (
      <div className="text-center py-8">
        <p className="text-gray text-sm">Complete the previous steps first.</p>
      </div>
    );
  }

  const isLive = proxy.status === "live";

  return (
    <div className="space-y-4">
      {/* Inline chat */}
      <div className="border border-white/6 rounded-xl overflow-hidden">
        <div className="bg-white/4 px-4 py-2.5 flex items-center gap-2 border-b border-white/6">
          <img
            src={proxy.avatarUrl ?? "/mock-avatar.jpg"}
            alt={handle}
            className="w-6 h-6 rounded-full object-cover"
          />
          <span className="text-white text-xs font-medium">@{handle}</span>
          <span className="ml-auto text-gray text-[11px]">Test Chat</span>
        </div>

        <div className="h-[220px] overflow-y-auto px-4 py-3 space-y-3">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center opacity-60">
              <MessageSquare size={24} className="text-gray mb-2" />
              <p className="text-gray text-xs">Send a message to test your proxy</p>
            </div>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn("flex", msg.role === "user" ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[75%] rounded-2xl px-3 py-2 text-xs leading-relaxed",
                  msg.role === "user"
                    ? "bg-lime text-black rounded-br-md"
                    : "bg-white/6 text-white rounded-bl-md"
                )}
              >
                {msg.content || (
                  <span className="inline-flex gap-1">
                    <span className="w-1 h-1 rounded-full bg-gray animate-pulse" />
                    <span className="w-1 h-1 rounded-full bg-gray animate-pulse [animation-delay:0.2s]" />
                    <span className="w-1 h-1 rounded-full bg-gray animate-pulse [animation-delay:0.4s]" />
                  </span>
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleSubmit} className="px-3 pb-3">
          <div className="flex items-center gap-2 bg-white/4 border border-white/6 rounded-xl px-3 py-1.5">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Ask @${handle} anything...`}
              className="flex-1 bg-transparent text-white text-xs placeholder:text-gray/50 outline-none"
            />
            {isLoading ? (
              <button type="button" onClick={stop} className="p-1 rounded-full bg-red-500/20 text-red-400 cursor-pointer">
                <Square size={10} />
              </button>
            ) : (
              <button type="submit" disabled={!input.trim()} className="p-1 rounded-full bg-lime text-black disabled:opacity-30 cursor-pointer">
                <ArrowUp size={10} />
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Launch button */}
      {isLive ? (
        <div className="flex items-center gap-2 text-emerald-400 text-sm justify-center">
          <Check size={16} /> Your proxy is live!
        </div>
      ) : (
        <Button onClick={handleLaunch} disabled={launching} className="w-full" size="lg">
          {launching ? (
            <><Loader2 size={16} className="animate-spin" /> Launching...</>
          ) : (
            <><Zap size={16} /> Launch Proxi</>
          )}
        </Button>
      )}
    </div>
  );
}
