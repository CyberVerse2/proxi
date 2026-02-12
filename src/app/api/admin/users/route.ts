import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { getAllUsers } from "@/lib/db/admin-queries";

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") || 50), 100);
  const offset = Number(searchParams.get("offset") || 0);
  const search = searchParams.get("search") || undefined;

  const data = await getAllUsers({ limit, offset, search });
  return NextResponse.json(data);
}
