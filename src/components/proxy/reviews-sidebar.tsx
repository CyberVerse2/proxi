'use client';

import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatTimeAgo } from '@/lib/utils/formatting';

interface ReviewSummaryItem {
  id: string;
  score: number;
  text: string | null;
  createdAt: string;
  name: string;
  avatar: string | null;
}

export function ReviewsSidebar({
  rating,
  reviews,
  onViewAll
}: {
  rating: number;
  reviews: ReviewSummaryItem[];
  onViewAll: () => void;
}) {
  return (
    <Card className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-white font-semibold text-base">Reviews</h3>
        <div className="flex items-center gap-1">
          <Star size={14} className="text-yellow-400 fill-yellow-400" />
          <span className="text-white text-sm font-medium">{rating.toFixed(1)}</span>
        </div>
      </div>

      {reviews.length === 0 ? (
        <p className="text-gray text-sm">No reviews yet</p>
      ) : (
        <div className="space-y-3">
          {reviews.slice(0, 3).map((review) => (
            <div key={review.id} className="border-t border-white/6 pt-3 first:border-0 first:pt-0">
              <div className="flex items-center gap-2.5">
                {review.avatar ? (
                  <img
                    src={review.avatar}
                    alt={review.name}
                    width={32}
                    height={32}
                    className="rounded-full object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white">
                    {review.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white text-sm font-semibold">{review.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          size={11}
                          className={i < review.score ? 'text-yellow-400 fill-yellow-400' : 'text-gray/30'}
                        />
                      ))}
                    </div>
                    <span className="text-gray/50 text-xs">&middot; {formatTimeAgo(review.createdAt)}</span>
                  </div>
                </div>
              </div>
              {review.text && (
                <p className="text-gray text-sm leading-relaxed mt-1.5 ml-[42px]">{review.text}</p>
              )}
            </div>
          ))}
        </div>
      )}

      <Button variant="outline" size="sm" className="w-full cursor-pointer" onClick={onViewAll}>
        {reviews.length > 0 ? `Show all ${reviews.length} reviews` : 'View reviews'}
      </Button>
    </Card>
  );
}
