'use client';

import { useState } from 'react';
import { Star, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';

interface ReviewModalProps {
  proxyHandle: string;
  proxyName: string;
  proxyAvatar: string;
  privyId: string;
  onClose: () => void;
  onSubmitted: () => void;
}

export function ReviewModal({
  proxyHandle,
  proxyName,
  proxyAvatar,
  privyId,
  onClose,
  onSubmitted,
}: ReviewModalProps) {
  const { xHandle, xDisplayName: displayName, xProfileImageUrl } = useAuth();
  const [score, setScore] = useState(0);
  const [hoverScore, setHoverScore] = useState(0);
  const [showText, setShowText] = useState(false);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleStarClick = (star: number) => {
    setScore(star);
    // Short delay then show text input
    setTimeout(() => setShowText(true), 400);
  };

  const handleSubmit = async () => {
    if (score < 1) return;
    setSubmitting(true);
    try {
      await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proxyHandle,
          privyId,
          score,
          text: reviewText.trim() || undefined,
          userName: displayName ?? undefined,
          userHandle: xHandle ?? undefined,
          userAvatar: xProfileImageUrl ?? undefined,
        }),
      });
      setSubmitted(true);
      setTimeout(() => {
        onSubmitted();
        onClose();
      }, 1200);
    } catch {
      // silently fail — close modal
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkipText = () => {
    handleSubmit();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative z-10 w-[420px] max-w-[90vw] bg-[#1a1a1a] border border-white/10 rounded-2xl p-7 animate-in zoom-in-95 fade-in duration-200 shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        {submitted ? (
          /* ─── Thank you state ─── */
          <div className="text-center py-5">
            <div className="text-4xl mb-3">🎉</div>
            <p className="text-white font-semibold text-lg">Thanks for your review!</p>
            <p className="text-gray text-sm mt-1">Your feedback helps others</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="text-center mb-6">
              <img
                src={proxyAvatar}
                alt={proxyName}
                width={56}
                height={56}
                className="rounded-full mx-auto mb-3 border border-white/10"
              />
              <p className="text-white font-semibold text-lg">
                How was your chat?
              </p>
              <p className="text-gray text-sm mt-1">
                Rate your experience with {proxyName}
              </p>
            </div>

            {/* Star rating */}
            <div className="flex items-center justify-center gap-2.5 mb-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onMouseEnter={() => setHoverScore(i + 1)}
                  onMouseLeave={() => setHoverScore(0)}
                  onClick={() => handleStarClick(i + 1)}
                  className="cursor-pointer p-1 transition-transform hover:scale-110"
                >
                  <Star
                    size={36}
                    className={cn(
                      'transition-all duration-150',
                      i < (hoverScore || score)
                        ? 'text-yellow-400 fill-yellow-400 scale-110'
                        : 'text-white/20'
                    )}
                  />
                </button>
              ))}
            </div>

            {/* Score label */}
            {score > 0 && (
              <p className="text-center text-white/60 text-sm mb-5">
                {score === 1 && 'Poor'}
                {score === 2 && 'Fair'}
                {score === 3 && 'Good'}
                {score === 4 && 'Great'}
                {score === 5 && 'Excellent'}
              </p>
            )}

            {/* Text input (appears after starring) */}
            {showText && (
              <div className="animate-in slide-in-from-bottom-2 fade-in duration-300 space-y-3">
                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Tell others about your experience (optional)..."
                  rows={3}
                  autoFocus
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-base text-white placeholder:text-white/25 outline-none focus:border-white/20 transition-colors resize-none"
                />

                <div className="flex gap-2">
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex-1 py-3 bg-lime text-black text-base font-semibold rounded-xl hover:bg-lime/90 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? 'Submitting...' : 'Submit Review'}
                  </button>
                  <button
                    onClick={handleSkipText}
                    disabled={submitting}
                    className="px-5 py-3 text-gray text-base rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    Skip
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
