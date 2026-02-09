import { NextResponse } from "next/server";
import {
  getUserByPrivyId,
  getProxyByCreatorId,
  getUserRecentConversations,
} from "@/lib/db/queries";

/**
 * GET /api/portfolio/activity?privyId=...
 * Returns the user's created proxies and recent conversations.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const privyId = searchParams.get("privyId");
  if (!privyId) {
    return NextResponse.json({ error: "Missing privyId" }, { status: 400 });
  }

  try {
    const user = await getUserByPrivyId(privyId);
    if (!user) {
      return NextResponse.json({
        createdProxy: null,
        recentChats: [],
      });
    }

    const [createdProxy, recentChats] = await Promise.all([
      getProxyByCreatorId(user.id),
      getUserRecentConversations(user.id, 10),
    ]);

    return NextResponse.json({
      createdProxy: createdProxy
        ? {
            id: createdProxy.id,
            handle: createdProxy.xHandle,
            name: createdProxy.displayName ?? createdProxy.xHandle,
            avatar: createdProxy.avatarUrl,
            status: createdProxy.status,
            totalChats: createdProxy.totalChats,
            totalMessages: createdProxy.totalMessages,
            tokenAddress: createdProxy.tokenAddress,
          }
        : null,
      recentChats: recentChats.map((c) => ({
        id: c.id,
        title: c.title ?? "New conversation",
        updatedAt: c.updatedAt,
        totalMessages: c.totalMessages,
        proxyHandle: c.proxyHandle,
        proxyName: c.proxyName ?? c.proxyHandle,
        proxyAvatar: c.proxyAvatar,
      })),
    });
  } catch (error) {
    console.error("[portfolio/activity] Error:", error);
    return NextResponse.json(
      { createdProxy: null, recentChats: [] },
      { status: 200 },
    );
  }
}
