'use client';

import { Pencil, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatTimeAgo } from '@/lib/utils/formatting';

interface ReviewItem {
  id: string;
  score: number;
  text: string | null;
  createdAt: string;
  name: string;
  avatar: string | null;
}

export function ProxyReviewsTab({
  rating,
  reviews,
  canReview,
  showReviewForm,
  onToggleReviewForm,
  reviewScore,
  hoverScore,
  reviewText,
  submittingReview,
  setHoverScore,
  setReviewScore,
  setReviewText,
  onSubmitReview,
  onCancelReview
}: {
  rating: number;
  reviews: ReviewItem[];
  canReview: boolean;
  showReviewForm: boolean;
  onToggleReviewForm: () => void;
  reviewScore: number;
  hoverScore: number;
  reviewText: string;
  submittingReview: boolean;
  setHoverScore: (score: number) => void;
  setReviewScore: (score: number) => void;
  setReviewText: (text: string) => void;
  onSubmitReview: () => void;
  onCancelReview: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-white font-semibold text-lg">Reviews</h3>
          <div className="flex items-center gap-1">
            <Star size={16} className="text-yellow-400 fill-yellow-400" />
            <span className="text-white text-base font-medium">{rating.toFixed(1)}</span>
          </div>
          <span className="text-gray text-base">({reviews.length})</span>
        </div>
        {canReview && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 cursor-pointer"
            onClick={onToggleReviewForm}
          >
            <Pencil size={12} /> Write a Review
          </Button>
        )}
      </div>

      {showReviewForm && (
        <Card className="p-5 space-y-4 border-lime/20">
          <p className="text-white text-base font-semibold">Rate your experience</p>

          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <button
                key={i}
                type="button"
                onMouseEnter={() => setHoverScore(i + 1)}
                onMouseLeave={() => setHoverScore(0)}
                onClick={() => setReviewScore(i + 1)}
                className="cursor-pointer p-0.5"
              >
                <Star
                  size={24}
                  className={cn(
                    'transition-colors',
                    i < (hoverScore || reviewScore) ? 'text-yellow-400 fill-yellow-400' : 'text-gray/30'
                  )}
                />
              </button>
            ))}
            {reviewScore > 0 && <span className="text-white text-sm ml-2 font-medium">{reviewScore}/5</span>}
          </div>

          <textarea
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder="Share your experience (optional)..."
            rows={3}
            className="w-full bg-white/4 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-lime/30 transition-colors resize-none"
          />

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="rounded-lg cursor-pointer"
              disabled={reviewScore < 1 || submittingReview}
              onClick={onSubmitReview}
            >
              {submittingReview ? 'Submitting...' : 'Submit Review'}
            </Button>
            <Button variant="ghost" size="sm" className="cursor-pointer" onClick={onCancelReview}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {reviews.length === 0 ? (
        <Card className="text-center py-8">
          <Star size={32} className="text-gray/30 mx-auto mb-2" />
          <p className="text-gray text-base">No reviews yet</p>
          <p className="text-gray/60 text-sm mt-1">Be the first to review this proxy</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <Card key={review.id} className="p-4">
              <div className="flex items-center gap-3">
                {review.avatar ? (
                  <img
                    src={review.avatar}
                    alt={review.name}
                    width={40}
                    height={40}
                    className="rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold text-white shrink-0">
                    {review.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white text-base font-semibold">{review.name}</span>
                    <span className="text-gray/50 text-sm">{formatTimeAgo(review.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-0.5 mt-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        size={14}
                        className={i < review.score ? 'text-yellow-400 fill-yellow-400' : 'text-gray/30'}
                      />
                    ))}
                  </div>
                </div>
              </div>
              {review.text && <p className="text-gray text-base leading-relaxed mt-3">{review.text}</p>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
