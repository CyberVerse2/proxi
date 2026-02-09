import { NextResponse } from "next/server";
import {
  getProxyByHandle,
  getUserByPrivyId,
  upsertUser,
  getProxyReviews,
  getUserReviewForProxy,
  submitReview,
} from "@/lib/db/queries";

/**
 * GET /api/reviews?handle=<proxyHandle>&privyId=<optional>
 * Returns all reviews for a proxy.
 * If privyId is provided, also returns whether the user has already reviewed.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const handle = searchParams.get("handle");
  if (!handle) {
    return NextResponse.json({ error: "Missing handle" }, { status: 400 });
  }

  const proxy = await getProxyByHandle(handle);
  if (!proxy) {
    return NextResponse.json({ error: "Proxy not found" }, { status: 404 });
  }

  const reviews = await getProxyReviews(proxy.id);

  // Check if the current user has already reviewed
  let hasReviewed = false;
  const privyId = searchParams.get("privyId");
  if (privyId) {
    const user = await getUserByPrivyId(privyId);
    if (user) {
      const existing = await getUserReviewForProxy(user.id, proxy.id);
      hasReviewed = !!existing;
    }
  }

  return NextResponse.json({
    reviews: reviews.map((r) => ({
      id: r.id,
      score: r.score,
      text: r.reviewText,
      createdAt: r.createdAt,
      name: r.userName ?? r.userHandle ?? "Anonymous",
      handle: r.userHandle,
      avatar: r.userAvatar,
    })),
    rating: proxy.rating ?? 0,
    count: reviews.length,
    hasReviewed,
  });
}

/**
 * POST /api/reviews
 * Submit a review for a proxy.
 * Body: { proxyHandle, privyId, score, text? }
 */
export async function POST(request: Request) {
  const body = await request.json();
  const { proxyHandle, privyId, score, text } = body;

  if (!proxyHandle || !privyId || !score) {
    return NextResponse.json(
      { error: "Missing proxyHandle, privyId, or score" },
      { status: 400 },
    );
  }

  if (typeof score !== "number" || score < 1 || score > 5) {
    return NextResponse.json(
      { error: "Score must be between 1 and 5" },
      { status: 400 },
    );
  }

  const proxy = await getProxyByHandle(proxyHandle);
  if (!proxy) {
    return NextResponse.json({ error: "Proxy not found" }, { status: 404 });
  }

  let user = await getUserByPrivyId(privyId);
  if (!user) {
    user = await upsertUser({ privyId });
  }

  await submitReview(
    proxy.id,
    user.id,
    score,
    typeof text === "string" && text.trim() ? text.trim() : undefined,
  );

  return NextResponse.json({ success: true });
}
