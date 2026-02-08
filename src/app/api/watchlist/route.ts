import { NextResponse } from "next/server";
import { addToWatchlist, removeFromWatchlist, getUserWatchlist, getUserByPrivyId } from "@/lib/db/queries";

async function resolveUserId(userId: string | null, privyId: string | null): Promise<string | null> {
  if (userId) return userId;
  if (privyId) {
    const user = await getUserByPrivyId(privyId);
    return user?.id ?? null;
  }
  return null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = await resolveUserId(searchParams.get("userId"), searchParams.get("privyId"));
  if (!userId) return NextResponse.json({ error: "Missing userId or privyId" }, { status: 400 });

  const items = await getUserWatchlist(userId);
  return NextResponse.json(items);
}

export async function POST(request: Request) {
  const body = await request.json();
  const userId = await resolveUserId(body.userId, body.privyId);
  const proxyId = body.proxyId;
  if (!userId || !proxyId) return NextResponse.json({ error: "Missing userId/privyId or proxyId" }, { status: 400 });

  const item = await addToWatchlist(userId, proxyId);
  return NextResponse.json(item, { status: 201 });
}

export async function DELETE(request: Request) {
  const body = await request.json();
  const userId = await resolveUserId(body.userId, body.privyId);
  const proxyId = body.proxyId;
  if (!userId || !proxyId) return NextResponse.json({ error: "Missing userId/privyId or proxyId" }, { status: 400 });

  await removeFromWatchlist(userId, proxyId);
  return NextResponse.json({ ok: true });
}
