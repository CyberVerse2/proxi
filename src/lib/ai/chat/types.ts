export interface ChatContext {
  systemPrompt: string;
  shouldFlag: boolean;
}

export interface WritingExample {
  category: string;
  text: string;
}

export interface CoreBrain {
  beliefs?: string[];
  opinions?: Record<string, string>;
  topicMap?: Record<string, string[]>;
  faq?: { question: string; answer: string }[];
  personality?: string;
  background?: string;
  reasoningStyle?: string;
  emotionalTriggers?: Record<string, string>;
  blindSpots?: string[];
  contradictions?: string[];
  vocabularyFingerprint?: string[];
}

export interface VoiceProfile {
  tone?: string;
  communicationStyle?: string;
  humorStyle?: string;
  emotionalRange?: string;
  vocabulary?: string[];
  sentencePatterns?: string[];
  punctuationHabits?: string[];
  capitalizationStyle?: string;
  emojiUsage?: string;
  catchphrases?: string[];
  openers?: string[];
  closers?: string[];
  rhetoricalDevices?: string[];
  uniqueTraits?: string[];
  toneMap?: Record<string, string>;
  topicPreferences?: string[];
}
