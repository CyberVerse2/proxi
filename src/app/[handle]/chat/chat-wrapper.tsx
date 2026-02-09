"use client";

import { useState, useCallback } from "react";
import { ChatClient } from "./chat-client";
import { ChatHistory } from "./chat-history";

interface ChatWrapperProps {
  handle: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
}

export function ChatWrapper({ handle, displayName, avatarUrl, bio }: ChatWrapperProps) {
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  // Incremented after each message to trigger a sidebar refresh
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSelectConversation = useCallback((id: string) => {
    setActiveConversationId(id);
  }, []);

  const handleNewChat = useCallback(() => {
    setActiveConversationId(null);
  }, []);

  const handleConversationChange = useCallback((id: string | null) => {
    setActiveConversationId(id);
  }, []);

  const handleMessageSent = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <>
      <div className="flex-1 min-w-0">
        <ChatClient
          handle={handle}
          displayName={displayName}
          avatarUrl={avatarUrl}
          bio={bio}
          conversationId={activeConversationId}
          onConversationChange={handleConversationChange}
          onMessageComplete={handleMessageSent}
        />
      </div>
      <ChatHistory
        proxyHandle={handle}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        refreshKey={refreshKey}
      />
    </>
  );
}
