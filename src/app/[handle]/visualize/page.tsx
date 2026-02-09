import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Brain,
  Lightbulb,
  MessageSquare,
  Compass,
  Flame,
  AlertTriangle,
  Shuffle,
  Fingerprint,
  Map,
  User,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getProxyByHandle } from "@/lib/db/queries";
import { TopNav } from "@/components/layout/top-nav";
import { DEFAULT_AVATAR } from "@/lib/config/constants";

interface Props {
  params: Promise<{ handle: string }>;
}

interface CoreBrain {
  beliefs?: string[];
  opinions?: Record<string, string>;
  topicMap?: Record<string, string[]>;
  faq?: { question: string; answer: string }[];
  personality?: string;
  background?: string;
  reasoningStyle?: string;
  emotionalTriggers?: Record<string, string>;
  blindSpots?: string[];
  contradictions?: string[];
  vocabularyFingerprint?: string[];
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default async function VisualizeBrainPage({ params }: Props) {
  const { handle } = await params;
  const proxy = await getProxyByHandle(handle);

  if (!proxy) return notFound();

  const brain = proxy.coreBrain as CoreBrain | null;

  if (!brain) {
    return (
      <>
        <TopNav />
        <main className="pt-20">
          <div className="max-w-5xl mx-auto px-6 pb-20 pt-8">
            <Link href={`/${handle}`} className="inline-flex items-center gap-2 text-gray hover:text-white text-base mb-8 transition-colors">
              <ArrowLeft size={18} /> Back to profile
            </Link>
            <div className="flex flex-col items-center justify-center py-32 text-center">
              <Brain size={52} className="text-gray/40 mb-4" />
              <h1 className="text-3xl font-bold text-white mb-2">No brain data yet</h1>
              <p className="text-gray text-base max-w-md">
                This proxy hasn&apos;t been built yet. Once @{handle} is ingested, their brain visualization will appear here.
              </p>
            </div>
          </div>
        </main>
      </>
    );
  }

  const hasTopicMap = brain.topicMap && Object.keys(brain.topicMap).length > 0;
  const hasOpinions = brain.opinions && Object.keys(brain.opinions).length > 0;
  const hasEmotionalTriggers = brain.emotionalTriggers && Object.keys(brain.emotionalTriggers).length > 0;

  return (
    <>
      <TopNav />
      <main className="pt-20">
        <div className="max-w-5xl mx-auto px-6 pb-20 pt-8">
          {/* Navigation */}
          <Link href={`/${handle}`} className="inline-flex items-center gap-2 text-gray hover:text-white text-base mb-8 transition-colors">
            <ArrowLeft size={18} /> Back to profile
          </Link>

          {/* Header */}
          <div className="flex items-center gap-5 mb-10">
            <img
              src={proxy.avatarUrl ?? DEFAULT_AVATAR}
              alt={proxy.displayName ?? handle}
              className="w-16 h-16 rounded-xl object-cover border border-white/[0.06]"
            />
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-white">Brain Map</h1>
                <Badge variant="lime">
                  <Brain size={12} /> Live
                </Badge>
              </div>
              <p className="text-gray text-base mt-0.5">
                Inside the mind of <span className="text-white font-medium">@{handle}</span>
              </p>
            </div>
          </div>

          <div className="space-y-8">
            {/* Personality */}
            {brain.personality && (
              <section className="animate-fade-up" style={{ animationDelay: "0ms" }}>
                <SectionHeader icon={<User size={18} />} title="Personality" color="lime" />
                <Card className="relative overflow-hidden border-lime/10 bg-gradient-to-br from-dark2 to-dark3">
                  <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-lime/30 to-transparent" />
                  <p className="text-white/90 text-base leading-relaxed whitespace-pre-line">
                    {brain.personality}
                  </p>
                </Card>
              </section>
            )}

            {/* Background */}
            {brain.background && (
              <section className="animate-fade-up" style={{ animationDelay: "50ms" }}>
                <SectionHeader icon={<Sparkles size={18} />} title="Background" color="purple" />
                <Card className="border-purple/10">
                  <p className="text-white/80 text-base leading-relaxed">
                    {brain.background}
                  </p>
                </Card>
              </section>
            )}

            {/* Topic Map */}
            {hasTopicMap && (
              <section className="animate-fade-up" style={{ animationDelay: "100ms" }}>
                <SectionHeader icon={<Map size={18} />} title="Topic Map" color="lime" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {Object.entries(brain.topicMap!).map(([category, subtopics]) => (
                    <Card key={category} className="group hover:border-lime/20 transition-colors">
                      <h4 className="text-white font-semibold text-base mb-2.5">{category}</h4>
                      <div className="flex flex-wrap gap-2">
                        {subtopics.map((sub) => (
                          <span key={sub} className="text-xs text-gray bg-white/[0.04] px-2.5 py-1 rounded-full border border-white/[0.06]">
                            {sub}
                          </span>
                        ))}
                      </div>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {/* Beliefs */}
            {brain.beliefs && brain.beliefs.length > 0 && (
              <section className="animate-fade-up" style={{ animationDelay: "150ms" }}>
                <SectionHeader icon={<Lightbulb size={18} />} title="Core Beliefs" color="lime" />
                <div className="space-y-2">
                  {brain.beliefs.map((belief, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-lg bg-dark2 border border-white/[0.06] p-4 hover:border-lime/15 transition-colors">
                      <div className="mt-1 w-2 h-2 rounded-full bg-lime shrink-0" />
                      <p className="text-white/85 text-base leading-relaxed">{belief}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Opinions */}
            {hasOpinions && (
              <section className="animate-fade-up" style={{ animationDelay: "200ms" }}>
                <SectionHeader icon={<Compass size={18} />} title="Stances & Opinions" color="lime" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(brain.opinions!).map(([topic, stance]) => (
                    <Card key={topic} className="hover:border-lime/15 transition-colors">
                      <h4 className="text-lime text-sm font-semibold uppercase tracking-wider mb-1.5">{topic}</h4>
                      <p className="text-white/80 text-base leading-relaxed">{stance}</p>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {/* Reasoning Style */}
            {brain.reasoningStyle && (
              <section className="animate-fade-up" style={{ animationDelay: "250ms" }}>
                <SectionHeader icon={<Brain size={18} />} title="How They Think" color="purple" />
                <Card className="relative overflow-hidden border-purple/10 bg-gradient-to-br from-dark2 to-dark3">
                  <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-purple/40 to-transparent" />
                  <p className="text-white/85 text-base leading-relaxed whitespace-pre-line">
                    {brain.reasoningStyle}
                  </p>
                </Card>
              </section>
            )}

            {/* Emotional Triggers */}
            {hasEmotionalTriggers && (
              <section className="animate-fade-up" style={{ animationDelay: "300ms" }}>
                <SectionHeader icon={<Flame size={18} />} title="Emotional Wiring" color="lime" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(brain.emotionalTriggers!).map(([trigger, reaction]) => {
                    const emoji = triggerEmoji(trigger);
                    return (
                      <Card key={trigger} className="hover:border-lime/15 transition-colors">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">{emoji}</span>
                          <h4 className="text-white font-semibold text-base capitalize">{trigger}</h4>
                        </div>
                        <p className="text-white/70 text-base leading-relaxed">{reaction}</p>
                      </Card>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Contradictions */}
            {brain.contradictions && brain.contradictions.length > 0 && (
              <section className="animate-fade-up" style={{ animationDelay: "350ms" }}>
                <SectionHeader icon={<Shuffle size={18} />} title="Contradictions" color="purple" subtitle="Where their beliefs conflict — the human stuff" />
                <div className="space-y-2">
                  {brain.contradictions.map((c, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-lg bg-purple/[0.04] border border-purple/10 p-4">
                      <Shuffle size={14} className="text-purple mt-0.5 shrink-0" />
                      <p className="text-white/75 text-base leading-relaxed">{c}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Blind Spots */}
            {brain.blindSpots && brain.blindSpots.length > 0 && (
              <section className="animate-fade-up" style={{ animationDelay: "400ms" }}>
                <SectionHeader icon={<AlertTriangle size={18} />} title="Blind Spots" color="gray" subtitle="Topics they avoid or perspectives they miss" />
                <div className="space-y-2">
                  {brain.blindSpots.map((b, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-lg bg-white/[0.02] border border-white/[0.06] p-4">
                      <AlertTriangle size={14} className="text-gray mt-0.5 shrink-0" />
                      <p className="text-gray text-base leading-relaxed">{b}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Vocabulary Fingerprint */}
            {brain.vocabularyFingerprint && brain.vocabularyFingerprint.length > 0 && (
              <section className="animate-fade-up" style={{ animationDelay: "450ms" }}>
                <SectionHeader icon={<Fingerprint size={18} />} title="Vocabulary Fingerprint" color="lime" subtitle="Phrases that are uniquely them" />
                <div className="flex flex-wrap gap-2">
                  {brain.vocabularyFingerprint.map((phrase) => (
                    <span
                      key={phrase}
                      className="text-base text-lime bg-lime/[0.06] border border-lime/15 px-4 py-2 rounded-full font-medium"
                    >
                      &ldquo;{phrase}&rdquo;
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* FAQ */}
            {brain.faq && brain.faq.length > 0 && (
              <section className="animate-fade-up" style={{ animationDelay: "500ms" }}>
                <SectionHeader icon={<MessageSquare size={18} />} title="How They&apos;d Answer" color="lime" subtitle="Pre-loaded Q&A in their voice" />
                <div className="space-y-2">
                  {brain.faq.map((item, i) => (
                    <details key={i} className="group rounded-lg bg-dark2 border border-white/[0.06] hover:border-lime/15 transition-colors">
                      <summary className="flex items-center gap-3 p-4 cursor-pointer list-none select-none">
                        <span className="text-lime text-sm font-bold shrink-0">Q</span>
                        <span className="text-white text-base font-medium flex-1">{item.question}</span>
                        <span className="text-gray text-sm group-open:rotate-90 transition-transform">&#9656;</span>
                      </summary>
                      <div className="px-4 pb-4 pt-0 ml-7">
                        <p className="text-white/70 text-base leading-relaxed italic">&ldquo;{item.answer}&rdquo;</p>
                      </div>
                    </details>
                  ))}
                </div>
              </section>
            )}

            {/* Footer CTA */}
            <div className="flex items-center justify-center gap-4 pt-8 pb-4">
              <Link href={`/${handle}/chat`}>
                <Button size="lg">
                  <MessageSquare size={18} /> Chat with this brain
                </Button>
              </Link>
              <Link href={`/${handle}`}>
                <Button variant="outline" size="sm">
                  View Profile
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Section header component                                           */
/* ------------------------------------------------------------------ */

function SectionHeader({
  icon,
  title,
  color,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  color: "lime" | "purple" | "gray";
  subtitle?: string;
}) {
  const colorMap = {
    lime: "text-lime",
    purple: "text-purple",
    gray: "text-gray",
  };

  return (
    <div className="mb-3">
      <div className="flex items-center gap-2">
        <span className={colorMap[color]}>{icon}</span>
        <h2 className="text-white font-bold text-xl">{title}</h2>
      </div>
      {subtitle && <p className="text-gray text-sm mt-0.5 ml-[26px]">{subtitle}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function triggerEmoji(trigger: string): string {
  const lower = trigger.toLowerCase();
  if (lower.includes("excite") || lower.includes("excitement")) return "\u26A1";
  if (lower.includes("frustrat")) return "\uD83D\uDE24";
  if (lower.includes("passion")) return "\uD83D\uDD25";
  if (lower.includes("humor") || lower.includes("funny")) return "\uD83D\uDE0F";
  if (lower.includes("anger") || lower.includes("angry")) return "\uD83D\uDCA2";
  if (lower.includes("joy") || lower.includes("happy")) return "\u2728";
  if (lower.includes("sarcas")) return "\uD83D\uDE43";
  if (lower.includes("curios")) return "\uD83E\uDDD0";
  if (lower.includes("fear") || lower.includes("anxiety")) return "\uD83D\uDE30";
  if (lower.includes("pride")) return "\uD83D\uDCAA";
  if (lower.includes("disgust") || lower.includes("dismiss")) return "\uD83E\uDD2E";
  return "\uD83D\uDCA1";
}
