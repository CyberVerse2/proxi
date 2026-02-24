'use client';

import { useState } from 'react';

export interface ReviewItem {
  id: string;
  score: number;
  text: string | null;
  createdAt: string;
  name: string;
  handle: string | null;
  avatar: string | null;
}

export function useProxyReviews({
  initialReviews,
  proxyHandle,
  userId,
  authDisplayName,
  authXHandle,
  authAvatar
}: {
  initialReviews: ReviewItem[];
  proxyHandle: string;
  userId: string | undefined;
  authDisplayName: string | null;
  authXHandle: string | null;
  authAvatar: string | null;
}) {
  const [reviews, setReviews] = useState<ReviewItem[]>(initialReviews);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewScore, setReviewScore] = useState(0);
  const [hoverScore, setHoverScore] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const resetReviewForm = () => {
    setShowReviewForm(false);
    setReviewScore(0);
    setReviewText('');
  };

  const handleSubmitReview = async () => {
    if (!userId || reviewScore < 1) return;
    setSubmittingReview(true);
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proxyHandle,
          privyId: userId,
          score: reviewScore,
          text: reviewText.trim() || undefined,
          userName: authDisplayName ?? undefined,
          userHandle: authXHandle ?? undefined,
          userAvatar: authAvatar ?? undefined
        })
      });
      if (!res.ok) return;

      const listRes = await fetch(`/api/reviews?handle=${encodeURIComponent(proxyHandle)}`);
      if (!listRes.ok) return;
      const data = await listRes.json();
      setReviews(data.reviews ?? []);
      resetReviewForm();
    } catch {
      // silent fail to match current behavior
    } finally {
      setSubmittingReview(false);
    }
  };

  return {
    reviews,
    showReviewForm,
    setShowReviewForm,
    reviewScore,
    setReviewScore,
    hoverScore,
    setHoverScore,
    reviewText,
    setReviewText,
    submittingReview,
    handleSubmitReview,
    resetReviewForm
  };
}
