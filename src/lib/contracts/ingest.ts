export interface IngestResultContract {
  tweetsCollected: number;
  threadsDetected: number;
  afterFilter: number;
  topSelected: number;
  chunksStored: number;
  voiceProfile: Record<string, unknown>;
  coreBrain: Record<string, unknown>;
  categorySlug?: string;
}

export interface IngestDomainContract {
  runFullIngestion: (
    proxyId: string,
    xHandle: string,
    onProgress?: (step: string, detail: string) => void,
    maxTweets?: number
  ) => Promise<IngestResultContract>;
}
