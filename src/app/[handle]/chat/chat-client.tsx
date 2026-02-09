'use client';

import { useState, useRef, useEffect } from 'react';
import { ArrowUp, Square, ChevronDown } from 'lucide-react';
import { useChat } from '@/hooks/use-chat';
import { useAuth } from '@/hooks/use-auth';
import Image from 'next/image';
import { ReviewModal } from './review-modal';

interface ChatClientProps {
  handle: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  conversationId?: string | null;
  onConversationChange?: (id: string | null) => void;
  onMessageComplete?: () => void;
}

export function ChatClient({
  handle,
  displayName,
  avatarUrl,
  bio,
  conversationId: externalConvoId,
  onConversationChange,
  onMessageComplete,
}: ChatClientProps) {
  const { user, xHandle, xProfileImageUrl } = useAuth();
  const {
    messages,
    isLoading,
    sendMessage,
    stop,
    conversationId: hookConvoId,
    loadConversation,
    resetChat,
  } = useChat({
    proxyHandle: handle,
    privyId: user?.id ?? null,
  });
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  // Review modal state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);
  const reviewPromptedRef = useRef(false);

  // Check if user already reviewed this proxy
  useEffect(() => {
    if (!user?.id) return;
    fetch(`/api/reviews?handle=${encodeURIComponent(handle)}&privyId=${encodeURIComponent(user.id)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.hasReviewed) setHasReviewed(true);
      })
      .catch(() => {});
  }, [user?.id, handle]);

  // When the parent changes the conversation (from history panel), load it
  useEffect(() => {
    if (externalConvoId && externalConvoId !== hookConvoId) {
      loadConversation(externalConvoId);
    } else if (externalConvoId === null && hookConvoId !== null) {
      resetChat();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalConvoId]);

  // Notify parent when a new conversation is created by the hook
  useEffect(() => {
    if (hookConvoId && hookConvoId !== externalConvoId) {
      onConversationChange?.(hookConvoId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hookConvoId]);

  // Notify parent when a message stream finishes (loading → not loading)
  const wasLoadingRef = useRef(false);
  useEffect(() => {
    if (wasLoadingRef.current && !isLoading) {
      onMessageComplete?.();

      // Check if we should prompt for a review
      if (!hasReviewed && !reviewPromptedRef.current && user?.id) {
        const userMsgCount = messages.filter((m) => m.role === 'user').length;
        if (userMsgCount >= 3) {
          reviewPromptedRef.current = true;
          // Small delay so the last message renders first
          setTimeout(() => setShowReviewModal(true), 1500);
        }
      }
    }
    wasLoadingRef.current = isLoading;
  }, [isLoading, onMessageComplete, hasReviewed, messages, user?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const gap = el.scrollHeight - el.scrollTop - el.clientHeight;
      setShowScrollBtn(gap > 120);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    setInput('');
    sendMessage(trimmed);
  };

  const scrollToBottom = () => bottomRef.current?.scrollIntoView({ behavior: 'smooth' });

  const avatar = avatarUrl ?? '/mock-avatar.jpg';
  const name = displayName ?? handle;
  const userName = xHandle ?? 'You';
  const userAvatar = xProfileImageUrl ?? null;

  return (
    <div className="h-screen w-full relative overflow-hidden bg-black ">
      {/* ============ Full-viewport background ============ */}
      <div
        aria-hidden
        className="fixed inset-0 z-0 pointer-events-none"
        style={{ overflow: 'hidden' }}
      >
        {/* Layer 1: blurred PFP fills entire viewport (ambient sides) */}
        <Image
          src={avatar}
          alt=""
          fill
          className="object-cover blur-3xl scale-125 opacity-30"
          style={{ pointerEvents: 'none', userSelect: 'none' }}
          priority
        />
        {/* Layer 2: clearer PFP in center with radial fade — NOT too bright */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${avatar})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center 30%',
            opacity: 0.35,
            maskImage: 'radial-gradient(ellipse 50% 45% at 50% 35%, black 0%, transparent 75%)',
            WebkitMaskImage:
              'radial-gradient(ellipse 50% 45% at 50% 35%, black 0%, transparent 75%)',
            pointerEvents: 'none',
            userSelect: 'none'
          }}
        />
        {/* Layer 3: dark overlay — heavier at edges, medium in center */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 55% 50% at 50% 35%, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.85) 100%)',
            pointerEvents: 'none',
            userSelect: 'none'
          }}
        />
      </div>

      {/* ============ Chat interface (centered, h-screen) ============ */}
      <div className="relative z-10 flex flex-col h-full items-center bottom-0">
        <div className="w-full max-w-[720px] flex flex-col h-full ">
          {/* ─── Hero header (fixed at top) ─── */}
          {/* --- Chat Header (Fixed) --- */}
          <div
            className="flex flex-col items-center justify-center px-4 pt-4 pb-2 text-center shrink-0 "
            style={{ position: 'sticky', top: 0, zIndex: 15 }}
          >
            <Image
              src={avatar}
              alt={name}
              width={64}
              height={64}
              className="rounded-full object-cover border border-white/10 shadow-sm"
              style={{ minWidth: 52, minHeight: 52 }}
            />
            <h1 className="text-white font-semibold text-lg mt-2">{name}</h1>
            {bio && (
              <p className="text-white/60 text-sm mt-1 max-w-[380px] mx-auto line-clamp-1">{bio}</p>
            )}
          </div>

          {/* Scroll-to-bottom FAB */}
          {showScrollBtn && (
            <button
              onClick={scrollToBottom}
              className="absolute top-[180px] left-1/2 -translate-x-1/2 z-20 w-8 h-8 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center cursor-pointer hover:bg-white/20 transition-colors"
            >
              <ChevronDown size={16} className="text-white" />
            </button>
          )}

          {/* ─── Messages (scrollable) ─── */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto scrollbar-none px-4 pb-2 space-y-5"
          >
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center opacity-40">
                <p className="text-white/70 text-base">Start chatting with @{handle}</p>
              </div>
            )}

            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              const lines =
                msg.role === 'assistant' && msg.content
                  ? msg.content.split('\n').filter((l) => l.trim() !== '')
                  : null;

              /* ---------- Assistant multi-line ---------- */
              if (lines && lines.length > 1) {
                return (
                  <div key={msg.id} className="space-y-1.5">
                    <NameTag src={avatar} label={name} />
                    {lines.map((line, i) => (
                      <div
                        key={`${msg.id}-${i}`}
                        className="w-fit max-w-[85%] rounded-2xl rounded-bl-md px-4 py-3 text-[15px] leading-relaxed bg-white/8 backdrop-blur-md text-white border border-white/6"
                      >
                        {line}
                      </div>
                    ))}
                  </div>
                );
              }

              /* ---------- User message ---------- */
              if (isUser) {
                return (
                  <div key={msg.id} className="space-y-3">
                    <div className="flex items-center gap-2 justify-end">
                      <span className="text-white/50 text-sm font-medium">{userName}</span>
                      {userAvatar ? (
                        <Image
                          src={userAvatar}
                          alt={userName}
                          width={20}
                          height={20}
                          className="rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-lime flex items-center justify-center text-[10px] font-bold text-black">
                          {userName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex justify-end">
                      <div className="w-fit max-w-[85%] rounded-2xl rounded-br-md px-4 py-3 text-[15px] leading-relaxed bg-white/8 backdrop-blur-md text-white border border-white/6">
                        {msg.content}
                      </div>
                    </div>
                  </div>
                );
              }

              /* ---------- Assistant single message ---------- */
              return (
                <div key={msg.id} className="space-y-3">
                  <NameTag src={avatar} label={name} />
                  <div className="max-w-fit rounded-2xl rounded-bl-md px-4 py-3 text-[15px] leading-relaxed bg-white/8 backdrop-blur-md text-white border border-white/6">
                    {msg.content || (
                      <span className="inline-flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray animate-blink" />
                        <span className="w-1.5 h-1.5 rounded-full bg-gray animate-blink [animation-delay:0.2s]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-gray animate-blink [animation-delay:0.4s]" />
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* ─── Input bar (fixed at bottom) ─── */}
          <div className="shrink-0 px-4 pb-4 pt-2">
            <form onSubmit={handleSubmit}>
              <div className="flex items-center gap-2 bg-white/8 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-3 focus-within:border-lime/30 transition-colors">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={`Message ${name}...`}
                  className="flex-1 bg-transparent text-white text-base placeholder:text-white/30 outline-none"
                />
                {isLoading ? (
                  <button
                    type="button"
                    onClick={stop}
                    className="p-2.5 rounded-full bg-red-500/20 text-red-400 cursor-pointer"
                  >
                    <Square size={16} />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={!input.trim()}
                    className="p-2.5 rounded-full bg-lime text-black disabled:opacity-30 cursor-pointer"
                  >
                    <ArrowUp size={16} />
                  </button>
                )}
              </div>
            </form>
            <p className="text-white/20 text-xs text-center mt-2">
              This is an AI clone. Responses are generated, not from the real person.
            </p>
          </div>
        </div>
      </div>

      {/* Review modal */}
      {showReviewModal && user?.id && (
        <ReviewModal
          proxyHandle={handle}
          proxyName={name}
          proxyAvatar={avatar}
          privyId={user.id}
          onClose={() => setShowReviewModal(false)}
          onSubmitted={() => setHasReviewed(true)}
        />
      )}
    </div>
  );
}

function NameTag({ src, label }: { src: string; label: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <Image src={src} alt={label} width={28} height={28} className="rounded-full object-cover" />
      <span className="text-white/70 text-sm font-medium">{label}</span>
    </div>
  );
}
