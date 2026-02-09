import { NextRequest, NextResponse } from "next/server";
import {
  getUserByPrivyId,
  getProxyByHandle,
  getUserConversations,
} from "@/lib/db/queries";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const privyId = searchParams.get("privyId");
  const proxyHandle = searchParams.get("proxyHandle");

  if (!privyId || !proxyHandle) {
    return NextResponse.json(
      { error: "Missing privyId or proxyHandle" },
      { status: 400 }
    );
  }

  const user = await getUserByPrivyId(privyId);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const proxy = await getProxyByHandle(proxyHandle);
  if (!proxy) {
    return NextResponse.json({ error: "Proxy not found" }, { status: 404 });
  }

  const convos = await getUserConversations(user.id, proxy.id);

  return NextResponse.json({ conversations: convos });
}
