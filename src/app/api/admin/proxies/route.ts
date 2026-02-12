import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { getAllProxies } from "@/lib/db/admin-queries";
import { db } from "@/lib/db";
import { proxies } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") || 50), 100);
  const offset = Number(searchParams.get("offset") || 0);
  const status = searchParams.get("status") || undefined;
  const search = searchParams.get("search") || undefined;

  const data = await getAllProxies({ limit, offset, status, search });
  return NextResponse.json(data);
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json();
  const { id, status } = body;

  if (!id || !status) {
    return NextResponse.json({ error: "Missing id or status" }, { status: 400 });
  }

  const validStatuses = ["pending", "building", "live", "paused", "failed"];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  await db
    .update(proxies)
    .set({ status, updatedAt: new Date() })
    .where(eq(proxies.id, id));

  return NextResponse.json({ success: true });
}
