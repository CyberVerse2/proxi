export interface QueryDomainContract {
  getProxyByHandle: (handle: string) => Promise<unknown | null>;
  getProxyById: (id: string) => Promise<unknown | null>;
  getLiveProxies: (limit?: number, offset?: number) => Promise<unknown[]>;
  updateProxy: (id: string, data: Record<string, unknown>) => Promise<unknown>;
  getUserByPrivyId: (privyId: string) => Promise<unknown | null>;
  getUserByXHandle: (xHandle: string) => Promise<unknown | null>;
  getAllCategories: () => Promise<unknown[]>;
  getCategoryBySlug: (slug: string) => Promise<unknown | null>;
  createConversation: (proxyId: string, userId: string, title?: string) => Promise<unknown>;
  addMessage: (
    conversationId: string,
    role: string,
    content: string,
    flagged?: boolean
  ) => Promise<unknown>;
  getUserConversations: (userId: string, proxyId: string) => Promise<unknown[]>;
  getProxyQueue: (proxyId: string) => Promise<unknown[]>;
  getUserWatchlist: (userId: string) => Promise<unknown[]>;
  getLeaderboard: (limit?: number) => Promise<unknown[]>;
  getUserProxyMessageCount: (userId: string, proxyId: string) => Promise<number>;
  submitReview: (
    proxyId: string,
    userId: string,
    score: number,
    reviewText?: string
  ) => Promise<void>;
  storeChunks: (chunks: Array<Record<string, unknown>>) => Promise<unknown>;
  getProxyChunks: (proxyId: string, limit?: number) => Promise<unknown[]>;
}
