import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/admin";
import { getIngestionLogs } from "@/lib/db/admin-queries";

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") || 50), 100);
  const offset = Number(searchParams.get("offset") || 0);
  const proxyId = searchParams.get("proxyId") || undefined;
  const status = searchParams.get("status") || undefined;

  const data = await getIngestionLogs({ limit, offset, proxyId, status });
  return NextResponse.json(data);
}
