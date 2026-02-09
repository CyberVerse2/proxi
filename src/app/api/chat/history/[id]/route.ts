import { NextRequest, NextResponse } from "next/server";
import {
  getUserByPrivyId,
  getConversationById,
  getConversationMessages,
} from "@/lib/db/queries";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = request.nextUrl;
  const privyId = searchParams.get("privyId");

  if (!privyId) {
    return NextResponse.json({ error: "Missing privyId" }, { status: 400 });
  }

  const user = await getUserByPrivyId(privyId);
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const conversation = await getConversationById(id);
  if (!conversation) {
    return NextResponse.json(
      { error: "Conversation not found" },
      { status: 404 }
    );
  }

  // Validate ownership
  if (conversation.userId !== user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const msgs = await getConversationMessages(id);

  return NextResponse.json({
    conversation: {
      id: conversation.id,
      title: conversation.title,
      updatedAt: conversation.updatedAt,
      totalMessages: conversation.totalMessages,
    },
    messages: msgs.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: m.createdAt,
    })),
  });
}
