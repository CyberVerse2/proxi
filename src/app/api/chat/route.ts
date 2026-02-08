import { streamText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { getProxyByHandle } from "@/lib/db/queries";
import { getChatContext } from "@/lib/ai/chat";

export async function POST(request: Request) {
  const { proxyHandle, messages } = await request.json();

  if (!proxyHandle || !messages?.length) {
    return new Response("Missing proxyHandle or messages", { status: 400 });
  }

  const proxy = await getProxyByHandle(proxyHandle);
  if (!proxy) {
    return new Response("Proxy not found", { status: 404 });
  }

  const lastUserMessage = messages.filter((m: { role: string }) => m.role === "user").pop();
  const { systemPrompt, shouldFlag } = await getChatContext(proxy, lastUserMessage?.content ?? "");

  const result = streamText({
    model: anthropic("claude-sonnet-4-20250514"),
    system: systemPrompt,
    messages,
    maxOutputTokens: 1024,
  });

  // TODO: if shouldFlag, queue the message for creator review after response
  void shouldFlag;

  return result.toTextStreamResponse();
}
