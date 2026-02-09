import { notFound } from "next/navigation";
import { getProxyByHandle } from "@/lib/db/queries";
import { ChatShell } from "./chat-shell";
import { ChatWrapper } from "./chat-wrapper";

interface Props {
  params: Promise<{ handle: string }>;
}

export default async function ChatPage({ params }: Props) {
  const { handle } = await params;
  const proxy = await getProxyByHandle(handle);

  if (!proxy) return notFound();

  return (
    <ChatShell>
      <ChatWrapper
        handle={proxy.xHandle}
        displayName={proxy.displayName}
        avatarUrl={proxy.avatarUrl}
        bio={proxy.bio}
      />
    </ChatShell>
  );
}
