import { NextResponse } from "next/server";
import { getProxyByHandle } from "@/lib/db/queries";

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

  return NextResponse.json({
    id: proxy.id,
    xHandle: proxy.xHandle,
    creatorId: proxy.creatorId,
    ticker: proxy.ticker,
  });
}
