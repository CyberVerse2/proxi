"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Check, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";

const STEPS = [
  "Personality & Bio",
  "Topics & Expertise",
  "FAQs & Knowledge",
  "Config",
] as const;

export default function SetupPage() {
  const params = useParams<{ handle: string }>();
  const router = useRouter();
  const { ready, authenticated, xHandle, user, getAccessToken } = useAuth();
  const handle = params.handle;

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  // Step 1
  const [personality, setPersonality] = useState("");
  // Step 2
  const [topics, setTopics] = useState("");
  // Step 3
  const [faqs, setFaqs] = useState<string[]>([]);
  const [currentFaq, setCurrentFaq] = useState("");
  // Step 4
  const [chatPrice, setChatPrice] = useState("0.10");
  const [ticker, setTicker] = useState("");

  // Proxy data for auth guard
  const [proxyData, setProxyData] = useState<{
    id: string;
    creatorId: string | null;
    ticker: string | null;
  } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Fetch proxy to verify ownership
  useEffect(() => {
    if (!handle) return;
    async function checkProxy() {
      try {
        const res = await fetch(
          `/api/proxy/lookup?handle=${encodeURIComponent(handle)}`
        );
        if (res.ok) {
          const data = await res.json();
          setProxyData(data);
          if (data.ticker) setTicker(data.ticker);
          if (data.chatPrice != null) setChatPrice(String(data.chatPrice));
        }
      } catch {
        // Fallback: we'll check auth on the client side
      }
      setAuthChecked(true);
    }
    checkProxy();
  }, [handle]);

  // Auth guard: redirect if not authenticated or not the owner
  useEffect(() => {
    if (!ready || !authChecked) return;
    if (!authenticated) {
      router.push(`/${handle}/claim`);
      return;
    }
    if (xHandle && xHandle.toLowerCase() !== handle.toLowerCase()) {
      router.push(`/${handle}/claim`);
    }
  }, [ready, authenticated, xHandle, handle, authChecked, router]);

  const submitChunk = async (text: string) => {
    if (!text.trim()) return;
    try {
      const token = await getAccessToken?.();
      await fetch("/api/ingest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          proxyId: proxyData?.id,
          chunks: [
            {
              contentType: "private_note",
              originalText: text.trim(),
              priority: 10,
              qualityScore: 1.0,
            },
          ],
        }),
      });
    } catch {
      // silently continue
    }
  };

  const handleNext = async () => {
    setLoading(true);
    try {
      if (step === 0 && personality.trim()) {
        await submitChunk(
          `[Creator Bio & Personality]\n${personality.trim()}`
        );
      } else if (step === 1 && topics.trim()) {
        await submitChunk(
          `[Topics & Expertise]\n${topics.trim()}`
        );
      }
      // Step 2 (FAQs) are submitted inline
      // Step 3 (Config) is handled by handleComplete
      setStep((s) => s + 1);
    } finally {
      setLoading(false);
    }
  };

  const addFaq = async () => {
    if (!currentFaq.trim()) return;
    setLoading(true);
    try {
      await submitChunk(`[FAQ / Custom Knowledge]\n${currentFaq.trim()}`);
      setFaqs((prev) => [...prev, currentFaq.trim()]);
      setCurrentFaq("");
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      const privyId = user?.id;
      if (privyId) {
        await fetch("/api/proxy", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            privyId,
            ...(chatPrice ? { chatPrice: parseFloat(chatPrice) } : {}),
            ...(ticker.trim() ? { ticker: ticker.trim().toUpperCase() } : {}),
          }),
        });
      }
      router.push(`/${handle}`);
    } catch {
      router.push(`/${handle}`);
    } finally {
      setLoading(false);
    }
  };

  if (!ready || !authChecked) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-gray" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold">Setup Your Proxy</h1>
          <p className="text-gray text-sm">
            Customize your AI clone to make it more accurate
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex-1 flex flex-col items-center gap-1.5">
              <div
                className={`w-full h-1.5 rounded-full transition-colors ${
                  i <= step ? "bg-lime" : "bg-white/10"
                }`}
              />
              <span
                className={`text-[11px] font-medium transition-colors ${
                  i <= step ? "text-white" : "text-gray/50"
                }`}
              >
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Step Content */}
        <Card className="space-y-4">
          {step === 0 && (
            <>
              <h2 className="text-lg font-semibold">
                Personality & Bio
              </h2>
              <p className="text-gray text-sm">
                Tell us about yourself — your personality, background, and
                communication style. This helps your AI clone sound more like
                you.
              </p>
              <textarea
                value={personality}
                onChange={(e) => setPersonality(e.target.value)}
                placeholder="e.g. I'm a software engineer who loves explaining complex topics in simple terms. I'm sarcastic but friendly, and I often use analogies from gaming..."
                rows={5}
                className="w-full bg-white/4 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-lime/30 transition-colors resize-none"
              />
              <div className="flex justify-between">
                <Button
                  variant="ghost"
                  onClick={() => router.push(`/${handle}`)}
                  className="text-gray"
                >
                  Skip Setup
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={loading}
                  className="rounded-xl"
                >
                  {loading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    "Next"
                  )}
                </Button>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <h2 className="text-lg font-semibold">
                Topics & Expertise
              </h2>
              <p className="text-gray text-sm">
                What topics are you known for? What&apos;s your expertise? This
                helps your proxy give more informed answers.
              </p>
              <textarea
                value={topics}
                onChange={(e) => setTopics(e.target.value)}
                placeholder="e.g. Blockchain development, DeFi protocols, smart contract security, React/Next.js, system design..."
                rows={5}
                className="w-full bg-white/4 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-lime/30 transition-colors resize-none"
              />
              <div className="flex justify-between">
                <Button
                  variant="ghost"
                  onClick={() => setStep(0)}
                  className="text-gray"
                >
                  Back
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={loading}
                  className="rounded-xl"
                >
                  {loading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    "Next"
                  )}
                </Button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="text-lg font-semibold">
                FAQs & Custom Knowledge
              </h2>
              <p className="text-gray text-sm">
                Add notes, FAQs, or custom knowledge that your proxy should
                know. You can add multiple items.
              </p>

              {/* Added items */}
              {faqs.length > 0 && (
                <div className="space-y-2">
                  {faqs.map((faq, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 bg-white/4 rounded-lg px-3 py-2.5 text-sm"
                    >
                      <Check size={14} className="text-lime shrink-0 mt-0.5" />
                      <span className="text-white/80 flex-1 min-w-0 line-clamp-2">
                        {faq}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Input */}
              <div className="space-y-2">
                <textarea
                  value={currentFaq}
                  onChange={(e) => setCurrentFaq(e.target.value)}
                  placeholder="e.g. Q: What's your favorite programming language? A: Rust — I love its safety guarantees and performance..."
                  rows={3}
                  className="w-full bg-white/4 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-lime/30 transition-colors resize-none"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addFaq}
                  disabled={!currentFaq.trim() || loading}
                  className="rounded-lg gap-1.5"
                >
                  {loading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Plus size={14} />
                  )}
                  Add Item
                </Button>
              </div>

              <div className="flex justify-between pt-2">
                <Button
                  variant="ghost"
                  onClick={() => setStep(1)}
                  className="text-gray"
                >
                  Back
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  className="rounded-xl"
                >
                  Next
                </Button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="text-lg font-semibold">
                Configuration
              </h2>
              <p className="text-gray text-sm">
                Set your chat pricing and token ticker. You can claim your fees after setup.
              </p>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm text-gray font-medium">
                    Chat Price (USD per message)
                  </label>
                  <Input
                    type="number"
                    value={chatPrice}
                    onChange={(e) => setChatPrice(e.target.value)}
                    placeholder="0.10"
                    min="0"
                    step="0.01"
                  />
                  <p className="text-gray/50 text-xs">
                    Users pay this amount in USDC for each message sent to your
                    proxy
                  </p>
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <Button
                  variant="ghost"
                  onClick={() => setStep(2)}
                  className="text-gray"
                >
                  Back
                </Button>
                <Button
                  onClick={handleComplete}
                  disabled={loading}
                  className="rounded-xl"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 size={16} className="animate-spin" /> Saving...
                    </span>
                  ) : (
                    "Complete Setup and Claim Fees"
                  )}
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
