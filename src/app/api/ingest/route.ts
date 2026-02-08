import { NextResponse } from "next/server";
import { embedAndStoreChunks } from "@/lib/ai/embeddings";

export async function POST(request: Request) {
  const { proxyId, chunks } = await request.json();
  if (!proxyId || !chunks?.length) {
    return NextResponse.json({ error: "Missing proxyId or chunks" }, { status: 400 });
  }

  const count = await embedAndStoreChunks(proxyId, chunks);
  return NextResponse.json({ stored: count });
}
