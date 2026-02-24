import type { Proxy } from '@/lib/db/schema';

export interface ChatContextContract {
  systemPrompt: string;
  shouldFlag: boolean;
}

export interface ChatContextBuilderContract {
  getChatContext: (proxy: Proxy, userMessage: string) => Promise<ChatContextContract>;
}

export interface BrainBuilderContract {
  clusterByTopic: (posts: string[]) => Promise<{ topic: string; tweetIndices: number[] }[]>;
  buildCoreBrain: (
    posts: string[],
    voiceProfile: Record<string, unknown>
  ) => Promise<Record<string, unknown>>;
}
