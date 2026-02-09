import { streamText, generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import {
  getProxyByHandle,
  getUserByPrivyId,
  upsertUser,
  createConversation,
  addMessage,
  updateConversationTitle,
  getUserProxyMessageCount,
} from "@/lib/db/queries";
import { getChatContext } from "@/lib/ai/chat";
import { getOnChainTokenBalance } from "@/lib/chain/token";
import { getPrivyWalletAddress } from "@/lib/auth/privy";
import { FREE_MESSAGES_PER_PROXY } from "@/lib/config/constants";

/** Generate a short (3-6 word) conversation title from the first exchange */
async function generateChatTitle(
  userMessage: string,
  assistantResponse: string,
): Promise<string> {
  try {
    const { text } = await generateText({
      model: anthropic("claude-sonnet-4-20250514"),
      maxOutputTokens: 30,
      prompt: `Summarize this conversation in 3–6 words for a sidebar label. No quotes, no punctuation at the end, no emojis. Just a short phrase.

User: ${userMessage.slice(0, 200)}
Assistant: ${assistantResponse.slice(0, 200)}

Title:`,
    });
    const title = text.trim().replace(/^["']|["']$/g, "").slice(0, 80);
    return title || userMessage.slice(0, 60);
  } catch {
    return userMessage.slice(0, 60);
  }
}

export async function POST(request: Request) {
  const { proxyHandle, messages, privyId, conversationId } =
    await request.json();

  if (!proxyHandle || !messages?.length) {
    return new Response("Missing proxyHandle or messages", { status: 400 });
  }

  const proxy = await getProxyByHandle(proxyHandle);
  if (!proxy) {
    return new Response("Proxy not found", { status: 404 });
  }

  // Resolve user for persistence (optional — chat still works without auth)
  // Auto-create user record if they're authenticated but don't have a DB entry yet
  let dbUserId: string | null = null;
  if (privyId) {
    let user = await getUserByPrivyId(privyId);
    if (!user) {
      user = await upsertUser({ privyId });
    }
    dbUserId = user.id;
  }

  // Gate: check free message limit, then token balance
  if (dbUserId && proxy.tokenAddress) {
    const msgCount = await getUserProxyMessageCount(dbUserId, proxy.id);
    if (msgCount >= FREE_MESSAGES_PER_PROXY) {
      // Resolve wallet from Privy (source of truth)
      const walletAddress = privyId
        ? await getPrivyWalletAddress(privyId)
        : null;
      if (!walletAddress) {
        return new Response(
          JSON.stringify({
            error: "wallet_required",
            message: "Connect a wallet to continue chatting",
            freeUsed: msgCount,
            freeLimit: FREE_MESSAGES_PER_PROXY,
          }),
          { status: 402, headers: { "Content-Type": "application/json" } },
        );
      }
      try {
        const balance = await getOnChainTokenBalance(
          proxy.tokenAddress as `0x${string}`,
          walletAddress as `0x${string}`,
        );
        if (balance === 0n) {
          return new Response(
            JSON.stringify({
              error: "insufficient_tokens",
              message: "You need to hold proxy tokens to continue chatting",
              freeUsed: msgCount,
              freeLimit: FREE_MESSAGES_PER_PROXY,
            }),
            { status: 402, headers: { "Content-Type": "application/json" } },
          );
        }
      } catch (err) {
        // If balance check fails, allow the message through (fail-open)
        console.error("[chat] Token balance check failed, allowing message:", err);
      }
    }
  }

  // Create or reuse conversation
  let activeConversationId = conversationId ?? null;
  if (!activeConversationId && dbUserId) {
    const lastUserMsg = messages
      .filter((m: { role: string }) => m.role === "user")
      .pop();
    const title = lastUserMsg?.content
      ? lastUserMsg.content.slice(0, 80)
      : "New conversation";
    const convo = await createConversation(proxy.id, dbUserId, title);
    activeConversationId = convo.id;
  }

  // Persist the user message
  const lastUserMessage = messages
    .filter((m: { role: string }) => m.role === "user")
    .pop();
  if (activeConversationId && lastUserMessage) {
    await addMessage(activeConversationId, "user", lastUserMessage.content);
  }

  // Build context and stream
  const { systemPrompt, shouldFlag } = await getChatContext(
    proxy,
    lastUserMessage?.content ?? ""
  );

  const result = streamText({
    model: anthropic("claude-sonnet-4-20250514"),
    system: systemPrompt,
    messages,
    maxOutputTokens: 1024,
    async onFinish({ text }) {
      // Persist assistant response
      if (activeConversationId && text) {
        await addMessage(
          activeConversationId,
          "assistant",
          text,
          shouldFlag
        );
      }

      // Generate a smart title for the first exchange
      if (activeConversationId && !conversationId && lastUserMessage?.content) {
        const title = await generateChatTitle(
          lastUserMessage.content,
          text ?? "",
        );
        await updateConversationTitle(activeConversationId, title);
      }
    },
  });

  const response = result.toTextStreamResponse();

  // Attach conversation ID so the client can track it
  if (activeConversationId) {
    response.headers.set("X-Conversation-Id", activeConversationId);
    // Ensure the header is accessible from client-side fetch
    response.headers.set(
      "Access-Control-Expose-Headers",
      "X-Conversation-Id"
    );
  }

  return response;
}

/** Separate endpoint to create a conversation (used as fallback by the client) */
export async function PUT(request: Request) {
  const { proxyHandle, privyId } = await request.json();
  if (!proxyHandle || !privyId) {
    return new Response("Missing proxyHandle or privyId", { status: 400 });
  }
  const proxy = await getProxyByHandle(proxyHandle);
  if (!proxy) {
    return new Response("Proxy not found", { status: 404 });
  }
  let user = await getUserByPrivyId(privyId);
  if (!user) {
    user = await upsertUser({ privyId });
  }
  const convo = await createConversation(proxy.id, user.id, "New conversation");
  return Response.json({ conversationId: convo.id });
}
