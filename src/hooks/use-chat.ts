'use client';

import { useState, useCallback, useRef } from 'react';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}

export type PaymentError = 'insufficient_tokens' | 'wallet_required' | 'payment_failed' | null;

interface UseChatOptions {
  proxyHandle: string;
  privyId?: string | null;
}

export function useChat({ proxyHandle, privyId }: UseChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentRequired, setPaymentRequired] = useState<PaymentError>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  // Track the latest conversationId in a ref so the streaming callback always sees it
  const convoIdRef = useRef<string | null>(null);

  const sendMessage = useCallback(
    async (content: string) => {
      setError(null);
      setPaymentRequired(null);
      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content,
        createdAt: new Date()
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);

      const assistantId = crypto.randomUUID();
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: 'assistant', content: '', createdAt: new Date() }
      ]);

      try {
        // If this is the first message and user is authenticated, pre-create
        // the conversation so we don't depend on response headers for the ID.
        let activeConvoId = conversationId;
        if (!activeConvoId && privyId) {
          try {
            const createRes = await fetch('/api/chat', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ proxyHandle, privyId })
            });
            if (createRes.ok) {
              const data = await createRes.json();
              activeConvoId = data.conversationId ?? null;
              if (activeConvoId) {
                convoIdRef.current = activeConvoId;
                setConversationId(activeConvoId);
              }
            }
          } catch {
            // Non-critical — the streaming POST will still try to create one
          }
        }

        abortRef.current = new AbortController();
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            proxyHandle,
            conversationId: activeConvoId,
            privyId: privyId ?? undefined,
            messages: [...messages, userMsg].map((m) => ({
              role: m.role,
              content: m.content
            }))
          }),
          signal: abortRef.current.signal
        });

        if (res.status === 402) {
          const data = await res.json();
          const errType: PaymentError =
            data.error === 'insufficient_tokens'
              ? 'insufficient_tokens'
              : data.error === 'payment_failed'
                ? 'payment_failed'
                : 'wallet_required';
          setPaymentRequired(errType);
          // Remove the optimistic user + empty assistant messages
          setMessages((prev) => prev.filter((m) => m.id !== userMsg.id && m.id !== assistantId));
          return;
        }
        if (!res.ok) throw new Error('Failed to send message');
        if (!res.body) throw new Error('No response body');

        // Try to capture conversation ID from response header (fallback)
        const newConvoId = res.headers.get('X-Conversation-Id');
        if (newConvoId && !convoIdRef.current) {
          convoIdRef.current = newConvoId;
          setConversationId(newConvoId);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulated += decoder.decode(value, { stream: true });
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: accumulated } : m))
          );
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Something went wrong');
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
      } finally {
        setIsLoading(false);
      }
    },
    [proxyHandle, conversationId, privyId, messages]
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
    setIsLoading(false);
  }, []);

  /** Load a previous conversation from the API */
  const loadConversation = useCallback(
    async (convoId: string) => {
      if (!privyId) return;
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/chat/history/${convoId}?privyId=${encodeURIComponent(privyId)}`
        );
        if (!res.ok) throw new Error('Failed to load conversation');
        const data = await res.json();
        const loaded: ChatMessage[] = (data.messages ?? []).map(
          (m: { id: string; role: 'user' | 'assistant'; content: string; createdAt: string }) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            createdAt: new Date(m.createdAt)
          })
        );
        setMessages(loaded);
        setConversationId(convoId);
        convoIdRef.current = convoId;
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load conversation');
      } finally {
        setIsLoading(false);
      }
    },
    [privyId]
  );

  /** Reset to a blank "new chat" state */
  const resetChat = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setConversationId(null);
    convoIdRef.current = null;
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    messages,
    isLoading,
    error,
    paymentRequired,
    setPaymentRequired,
    conversationId,
    sendMessage,
    stop,
    loadConversation,
    resetChat
  };
}
