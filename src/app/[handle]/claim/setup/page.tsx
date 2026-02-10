"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { CREATOR_FEE_PERCENT } from "@/lib/config/constants";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface VoiceProfile {
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
}

interface CoreBrain {
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

interface ProxySetupData {
  id: string;
  xHandle: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  creatorId: string | null;
  ticker: string | null;
  chatPrice: number | null;
  tokenAddress: string | null;
  status: string;
  totalChats: number;
  totalMessages: number;
  marketCap: number | null;
  price: number | null;
  voiceProfile: VoiceProfile | null;
  coreBrain: CoreBrain | null;
  postsAnalyzed: number;
  createdAt: string;
}

interface TopicItem {
  name: string;
  posts: number;
  enabled: boolean;
}

interface TopicGroups {
  strong: TopicItem[];
  medium: TopicItem[];
  weak: TopicItem[];
}

/* ------------------------------------------------------------------ */
/*  Styles                                                             */
/* ------------------------------------------------------------------ */

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Dela+Gothic+One&family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap');

  .proxi-setup * { margin: 0; padding: 0; box-sizing: border-box; }

  .proxi-setup {
    font-family: 'DM Sans', sans-serif;
    background: #0A0A0F;
    color: #F5F5F0;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    position: relative;
    overflow: hidden;
    -webkit-font-smoothing: antialiased;
  }

  .proxi-setup::before {
    content: '';
    position: fixed;
    inset: 0;
    background: radial-gradient(ellipse at 30% 20%, rgba(191,255,0,0.04) 0%, transparent 60%),
                radial-gradient(ellipse at 70% 80%, rgba(124,101,193,0.03) 0%, transparent 60%);
    pointer-events: none;
  }

  .setup-container {
    width: 100%;
    max-width: 580px;
    position: relative;
    z-index: 1;
  }

  /* ── Header ── */
  .setup-header {
    text-align: center;
    margin-bottom: 32px;
  }

  .setup-logo {
    font-family: 'Dela Gothic One', sans-serif;
    font-size: 1.1rem;
    color: #BFFF00;
    margin-bottom: 24px;
    letter-spacing: -0.02em;
  }

  .setup-logo span { color: #F5F5F0; }

  .setup-title {
    font-family: 'Dela Gothic One', sans-serif;
    font-size: 1.6rem;
    line-height: 1.15;
    letter-spacing: -0.02em;
    margin-bottom: 8px;
  }

  .setup-subtitle {
    color: #8888A0;
    font-size: 0.9rem;
    line-height: 1.5;
  }

  /* ── Progress ── */
  .progress-bar {
    display: flex;
    gap: 6px;
    margin-bottom: 28px;
  }

  .progress-segment {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .progress-track {
    width: 100%;
    height: 3px;
    border-radius: 3px;
    background: rgba(255,255,255,0.06);
    overflow: hidden;
    position: relative;
  }

  .progress-fill {
    height: 100%;
    border-radius: 3px;
    background: #BFFF00;
    transition: width 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  .progress-label {
    font-size: 0.68rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    transition: color 0.3s;
  }

  .progress-label.active { color: #BFFF00; }
  .progress-label.done { color: #F5F5F0; }
  .progress-label.pending { color: rgba(255,255,255,0.2); }

  /* ── Card ── */
  .setup-card {
    background: #12121A;
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 20px;
    padding: 32px;
    position: relative;
    overflow: hidden;
  }

  .setup-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(191,255,0,0.15), transparent);
  }

  .card-title {
    font-family: 'Dela Gothic One', sans-serif;
    font-size: 1.15rem;
    margin-bottom: 8px;
    letter-spacing: -0.01em;
  }

  .card-desc {
    color: #8888A0;
    font-size: 0.85rem;
    line-height: 1.55;
    margin-bottom: 24px;
  }

  /* ── Buttons ── */
  .btn {
    padding: 12px 24px;
    border-radius: 100px;
    font-family: 'DM Sans', sans-serif;
    font-weight: 700;
    font-size: 0.88rem;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    border: none;
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }

  .btn-lime {
    background: #BFFF00;
    color: #0A0A0F;
  }

  .btn-lime:hover {
    transform: scale(1.03) translateY(-1px);
    box-shadow: 0 6px 24px rgba(191,255,0,0.25);
  }

  .btn-lime:disabled {
    opacity: 0.4;
    transform: none;
    box-shadow: none;
    cursor: not-allowed;
  }

  .btn-ghost {
    background: transparent;
    color: #8888A0;
    padding: 12px 16px;
  }

  .btn-ghost:hover { color: #F5F5F0; }

  .btn-outline {
    background: transparent;
    color: #F5F5F0;
    border: 1.5px solid rgba(255,255,255,0.12);
    padding: 10px 20px;
    font-size: 0.82rem;
  }

  .btn-outline:hover {
    border-color: #BFFF00;
    color: #BFFF00;
  }

  .btn-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 28px;
  }

  /* ── Step 0: Wow ── */
  .unclaimed-banner {
    background: linear-gradient(135deg, rgba(191,255,0,0.08) 0%, rgba(191,255,0,0.03) 100%);
    border: 1.5px solid rgba(191,255,0,0.2);
    border-radius: 16px;
    padding: 22px 24px;
    margin-bottom: 24px;
    text-align: center;
    position: relative;
    overflow: hidden;
  }

  .unclaimed-banner::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(191,255,0,0.05), transparent);
    animation: shimmer 3s ease-in-out infinite;
  }

  @keyframes shimmer {
    0%, 100% { transform: translateX(-100%); }
    50% { transform: translateX(100%); }
  }

  .unclaimed-label {
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #BFFF00;
    margin-bottom: 8px;
    position: relative;
  }

  .unclaimed-amount {
    font-family: 'Dela Gothic One', sans-serif;
    font-size: 2.4rem;
    color: #BFFF00;
    line-height: 1;
    margin-bottom: 6px;
    position: relative;
  }

  .unclaimed-sub {
    font-size: 0.8rem;
    color: rgba(245,245,240,0.5);
    position: relative;
  }

  .unclaimed-sub strong {
    color: #BFFF00;
    font-weight: 700;
  }

  .token-row {
    display: flex;
    gap: 10px;
    margin-bottom: 24px;
  }

  .token-stat {
    flex: 1;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 12px;
    padding: 14px 10px;
    text-align: center;
  }

  .token-stat-value {
    font-weight: 700;
    font-size: 0.95rem;
    color: #F5F5F0;
    margin-bottom: 3px;
  }

  .token-stat-label {
    font-size: 0.68rem;
    color: #8888A0;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .wow-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-bottom: 28px;
  }

  .wow-stat {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 14px;
    padding: 18px 14px;
    text-align: center;
  }

  .wow-stat-num {
    font-family: 'Dela Gothic One', sans-serif;
    font-size: 1.5rem;
    color: #BFFF00;
    line-height: 1;
    margin-bottom: 6px;
  }

  .wow-stat-label {
    font-size: 0.72rem;
    color: #8888A0;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .wow-preview {
    background: rgba(191,255,0,0.04);
    border: 1px solid rgba(191,255,0,0.1);
    border-radius: 14px;
    padding: 18px 20px;
    margin-bottom: 24px;
  }

  .wow-preview-label {
    font-size: 0.72rem;
    color: #BFFF00;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 10px;
  }

  .wow-preview-text {
    color: #F5F5F0;
    font-size: 0.88rem;
    line-height: 1.6;
    font-style: italic;
    opacity: 0.85;
  }

  .wow-actions {
    display: flex;
    gap: 12px;
  }

  .wow-actions .btn { width: 100%; justify-content: center; }

  /* ── Step 1: Voice ── */
  .voice-profile-box {
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 14px;
    padding: 20px;
    margin-bottom: 20px;
    font-size: 0.88rem;
    line-height: 1.65;
    color: rgba(245,245,240,0.8);
    font-style: italic;
  }

  .voice-sliders {
    display: flex;
    flex-direction: column;
    gap: 20px;
    margin-bottom: 20px;
  }

  .slider-row {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .slider-labels {
    display: flex;
    justify-content: space-between;
    font-size: 0.75rem;
    color: #8888A0;
    font-weight: 600;
  }

  .slider-track {
    width: 100%;
    height: 6px;
    -webkit-appearance: none;
    appearance: none;
    border-radius: 3px;
    background: rgba(255,255,255,0.08);
    outline: none;
    cursor: pointer;
  }

  .slider-track::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #BFFF00;
    cursor: pointer;
    box-shadow: 0 2px 8px rgba(191,255,0,0.3);
    transition: transform 0.2s;
  }

  .slider-track::-webkit-slider-thumb:hover {
    transform: scale(1.2);
  }

  .slider-track::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #BFFF00;
    cursor: pointer;
    border: none;
  }

  .voice-correction {
    width: 100%;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 12px;
    padding: 14px 16px;
    color: #F5F5F0;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.85rem;
    resize: none;
    outline: none;
    transition: border-color 0.3s;
    min-height: 72px;
  }

  .voice-correction::placeholder { color: rgba(255,255,255,0.2); }
  .voice-correction:focus { border-color: rgba(191,255,0,0.25); }

  .approved-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    border-radius: 100px;
    background: rgba(191,255,0,0.1);
    border: 1px solid rgba(191,255,0,0.2);
    color: #BFFF00;
    font-size: 0.82rem;
    font-weight: 700;
    margin-bottom: 16px;
  }

  /* ── Step 2: Topics ── */
  .topic-section {
    margin-bottom: 22px;
  }

  .topic-section-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
  }

  .topic-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
  }

  .topic-dot.green { background: #BFFF00; }
  .topic-dot.yellow { background: #FFD60A; }
  .topic-dot.red { background: #FF6B6B; }

  .topic-section-title {
    font-size: 0.78rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #8888A0;
  }

  .topic-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .topic-tag {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    border-radius: 100px;
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.25s;
    border: 1.5px solid transparent;
    user-select: none;
  }

  .topic-tag.enabled {
    background: rgba(191,255,0,0.08);
    border-color: rgba(191,255,0,0.2);
    color: #BFFF00;
  }

  .topic-tag.disabled {
    background: rgba(255,255,255,0.03);
    border-color: rgba(255,255,255,0.08);
    color: #8888A0;
  }

  .topic-tag:hover { transform: translateY(-1px); }

  .topic-tag .post-count {
    font-size: 0.7rem;
    opacity: 0.6;
    font-weight: 500;
  }

  .topic-tag .toggle-icon {
    font-size: 0.75rem;
    width: 16px;
    height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .add-topic-row {
    display: flex;
    gap: 8px;
    margin-top: 16px;
  }

  .add-topic-input {
    flex: 1;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 100px;
    padding: 10px 16px;
    color: #F5F5F0;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.85rem;
    outline: none;
    transition: border-color 0.3s;
  }

  .add-topic-input::placeholder { color: rgba(255,255,255,0.2); }
  .add-topic-input:focus { border-color: rgba(191,255,0,0.25); }

  /* ── Test Chat ── */
  .test-chat {
    background: rgba(255,255,255,0.02);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 14px;
    padding: 16px;
    margin-top: 20px;
  }

  .test-chat-label {
    font-size: 0.72rem;
    color: #8888A0;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 12px;
  }

  .chat-messages {
    display: flex;
    flex-direction: column;
    gap: 10px;
    max-height: 200px;
    overflow-y: auto;
    margin-bottom: 12px;
    padding-right: 4px;
  }

  .chat-msg {
    padding: 10px 14px;
    border-radius: 14px;
    font-size: 0.84rem;
    line-height: 1.5;
    max-width: 85%;
    animation: msgIn 0.3s ease both;
  }

  @keyframes msgIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .chat-msg.user {
    background: rgba(191,255,0,0.12);
    color: #BFFF00;
    align-self: flex-end;
    border-bottom-right-radius: 4px;
  }

  .chat-msg.proxy {
    background: rgba(255,255,255,0.06);
    color: rgba(245,245,240,0.85);
    align-self: flex-start;
    border-bottom-left-radius: 4px;
  }

  .chat-msg.typing {
    color: #8888A0;
  }

  .chat-msg.typing .dots span {
    animation: blink 1.4s infinite both;
    display: inline-block;
  }
  .chat-msg.typing .dots span:nth-child(2) { animation-delay: 0.2s; }
  .chat-msg.typing .dots span:nth-child(3) { animation-delay: 0.4s; }

  @keyframes blink {
    0%, 80%, 100% { opacity: 0.2; }
    40% { opacity: 1; }
  }

  .chat-input-row {
    display: flex;
    gap: 8px;
  }

  .chat-input {
    flex: 1;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 100px;
    padding: 10px 16px;
    color: #F5F5F0;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.84rem;
    outline: none;
    transition: border-color 0.3s;
  }

  .chat-input::placeholder { color: rgba(255,255,255,0.2); }
  .chat-input:focus { border-color: rgba(191,255,0,0.25); }

  .chat-send {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: #BFFF00;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #0A0A0F;
    font-size: 1rem;
    transition: all 0.2s;
    flex-shrink: 0;
  }

  .chat-send:hover { transform: scale(1.08); }
  .chat-send:disabled { opacity: 0.3; cursor: not-allowed; transform: none; }

  /* ── Step 3: Knowledge ── */
  .knowledge-items {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 16px;
  }

  .knowledge-item {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    background: rgba(191,255,0,0.04);
    border: 1px solid rgba(191,255,0,0.1);
    border-radius: 12px;
    padding: 12px 14px;
    animation: msgIn 0.3s ease both;
  }

  .knowledge-check {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: rgba(191,255,0,0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-top: 1px;
    color: #BFFF00;
    font-size: 0.7rem;
  }

  .knowledge-text {
    font-size: 0.84rem;
    color: rgba(245,245,240,0.75);
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .knowledge-textarea {
    width: 100%;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 12px;
    padding: 14px 16px;
    color: #F5F5F0;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.85rem;
    resize: none;
    outline: none;
    transition: border-color 0.3s;
    min-height: 88px;
    margin-bottom: 10px;
  }

  .knowledge-textarea::placeholder { color: rgba(255,255,255,0.2); }
  .knowledge-textarea:focus { border-color: rgba(191,255,0,0.25); }

  .knowledge-examples {
    margin-top: 16px;
    padding: 14px 16px;
    background: rgba(255,255,255,0.02);
    border-radius: 12px;
    border: 1px solid rgba(255,255,255,0.04);
  }

  .knowledge-examples-title {
    font-size: 0.72rem;
    color: #8888A0;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 8px;
  }

  .knowledge-example {
    font-size: 0.8rem;
    color: rgba(255,255,255,0.35);
    line-height: 1.6;
    padding: 2px 0;
  }

  /* ── Step 4: Config ── */
  .config-field {
    margin-bottom: 24px;
  }

  .config-label {
    font-size: 0.82rem;
    font-weight: 700;
    margin-bottom: 8px;
    display: block;
  }

  .config-input {
    width: 100%;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 12px;
    padding: 14px 16px;
    color: #F5F5F0;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.95rem;
    font-weight: 600;
    outline: none;
    transition: border-color 0.3s;
  }

  .config-input::placeholder { color: rgba(255,255,255,0.2); }
  .config-input:focus { border-color: rgba(191,255,0,0.25); }

  .config-hint {
    font-size: 0.78rem;
    color: #8888A0;
    margin-top: 8px;
    line-height: 1.4;
  }

  .earnings-preview {
    background: rgba(191,255,0,0.05);
    border: 1px solid rgba(191,255,0,0.12);
    border-radius: 14px;
    padding: 18px 20px;
    margin-bottom: 24px;
  }

  .earnings-title {
    font-size: 0.72rem;
    color: #BFFF00;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 12px;
  }

  .earnings-rows {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .earnings-row {
    display: flex;
    justify-content: space-between;
    font-size: 0.85rem;
  }

  .earnings-row .label { color: #8888A0; }
  .earnings-row .value { font-weight: 700; color: #F5F5F0; }
  .earnings-row .value.lime { color: #BFFF00; }

  .fee-split {
    display: flex;
    gap: 4px;
    margin-bottom: 4px;
    height: 28px;
    border-radius: 8px;
    overflow: hidden;
  }

  .fee-split-bar {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.72rem;
    font-weight: 700;
  }

  .fee-split-bar.creator {
    background: linear-gradient(90deg, #BFFF00, #8FD600);
    color: #0A0A0F;
    width: ${CREATOR_FEE_PERCENT}%;
  }

  .fee-split-bar.protocol {
    background: linear-gradient(90deg, #7C65C1, #8A63D2);
    color: #F5F5F0;
    width: ${100 - CREATOR_FEE_PERCENT}%;
  }

  /* ── Animations ── */
  .fade-in {
    animation: fadeIn 0.5s ease both;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(16px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .stagger-1 { animation-delay: 0.05s; }
  .stagger-2 { animation-delay: 0.1s; }
  .stagger-3 { animation-delay: 0.15s; }
  .stagger-4 { animation-delay: 0.2s; }

  /* ── Loading ── */
  .setup-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background: #0A0A0F;
  }

  .setup-spinner {
    width: 24px;
    height: 24px;
    border: 2.5px solid rgba(255,255,255,0.1);
    border-top-color: #BFFF00;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  /* ── Responsive ── */
  @media (max-width: 480px) {
    .setup-card { padding: 24px 18px; }
    .wow-stats { grid-template-columns: repeat(3, 1fr); gap: 8px; }
    .wow-stat { padding: 14px 8px; }
    .wow-stat-num { font-size: 1.2rem; }
    .wow-actions { flex-direction: column; }
  }
`;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Build a voice summary string from the VoiceProfile fields */
function buildVoiceSummary(v: VoiceProfile): string {
  const parts: string[] = [];
  if (v.tone) parts.push(v.tone);
  if (v.communicationStyle) parts.push(v.communicationStyle);
  if (v.humorStyle) parts.push(`Humor: ${v.humorStyle}`);
  if (v.capitalizationStyle) parts.push(`Capitalization: ${v.capitalizationStyle}`);
  if (v.emojiUsage) parts.push(`Emojis: ${v.emojiUsage}`);
  if (v.catchphrases?.length) parts.push(`Catchphrases: ${v.catchphrases.join(", ")}`);
  if (v.uniqueTraits?.length) parts.push(`Traits: ${v.uniqueTraits.join(", ")}`);
  if (parts.length === 0) return "Voice profile is being generated...";
  return parts.join(". ") + ".";
}

/** Extract topics from coreBrain.topicMap into tiered groups */
function extractTopics(brain: CoreBrain | null): TopicGroups {
  if (!brain?.topicMap) return { strong: [], medium: [], weak: [] };

  const entries = Object.entries(brain.topicMap).map(([name, items]) => ({
    name,
    posts: Array.isArray(items) ? items.length : 0,
    enabled: true,
  }));

  // Sort by post count descending
  entries.sort((a, b) => b.posts - a.posts);

  const strong = entries.slice(0, Math.ceil(entries.length * 0.33));
  const medium = entries.slice(
    Math.ceil(entries.length * 0.33),
    Math.ceil(entries.length * 0.66)
  );
  const weak = entries.slice(Math.ceil(entries.length * 0.66)).map((t) => ({
    ...t,
    enabled: false,
  }));

  return { strong, medium, weak };
}

/** How long ago was the proxy created */
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return "less than an hour";
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const STEP_LABELS = ["Voice", "Knowledge", "Private Data", "Config"];

export default function SetupPage() {
  const params = useParams<{ handle: string }>();
  const router = useRouter();
  const { ready, authenticated, xHandle, user, getAccessToken } = useAuth();
  const handle = params.handle;

  // ─── Data loading ───
  const [proxy, setProxy] = useState<ProxySetupData | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [saving, setSaving] = useState(false);

  // ─── Step state (-1 = wow / overview screen) ───
  const [step, setStep] = useState(-1);

  // Step 0: Voice
  const [voiceApproved, setVoiceApproved] = useState(false);
  const [showSliders, setShowSliders] = useState(false);
  const [sliders, setSliders] = useState({ formality: 5, playfulness: 5, verbosity: 5 });
  const [voiceCorrection, setVoiceCorrection] = useState("");

  // Step 1: Topics + Test Chat
  const [topics, setTopics] = useState<TopicGroups>({ strong: [], medium: [], weak: [] });
  const [newTopic, setNewTopic] = useState("");
  const [chatMessages, setChatMessages] = useState<{ role: string; text: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatTyping, setChatTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Step 2: Private Knowledge
  const [knowledgeItems, setKnowledgeItems] = useState<string[]>([]);
  const [knowledgeInput, setKnowledgeInput] = useState("");
  const [knowledgeSaving, setKnowledgeSaving] = useState(false);

  // Step 3: Config
  const [chatPrice, setChatPrice] = useState("0.10");
  const [ticker, setTicker] = useState("");

  // ─── Fetch proxy data ───
  useEffect(() => {
    if (!handle) return;
    async function load() {
      try {
        const res = await fetch(`/api/proxy/lookup?handle=${encodeURIComponent(handle)}`);
        if (res.ok) {
          const data: ProxySetupData = await res.json();
          setProxy(data);
          if (data.ticker) setTicker(data.ticker);
          if (data.chatPrice != null) setChatPrice(String(data.chatPrice));
          if (data.coreBrain) setTopics(extractTopics(data.coreBrain));
        }
      } catch {
        // handled below with authChecked
      }
      setAuthChecked(true);
    }
    load();
  }, [handle]);

  // ─── Auth guard ───
  useEffect(() => {
    if (!ready || !authChecked) return;
    if (!authenticated) {
      router.push(`/${handle}/claim`);
      return;
    }
    if (xHandle && xHandle.toLowerCase() !== handle.toLowerCase()) {
      router.push(`/${handle}/claim`);
    }
  }, [ready, authenticated, xHandle, handle, authChecked, router]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatTyping]);

  // ─── Actions ───

  /** Submit a private knowledge chunk to the ingest API */
  const submitChunk = async (text: string) => {
    if (!text.trim() || !proxy) return;
    try {
      const token = await getAccessToken?.();
      await fetch("/api/ingest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          proxyId: proxy.id,
          chunks: [
            {
              contentType: "private_note",
              originalText: text.trim(),
              priority: 10,
              qualityScore: 1.0,
            },
          ],
        }),
      });
    } catch {
      // silently continue
    }
  };

  /** Save voice corrections — updates the actual voiceProfile on the proxy record
   *  so the AI uses the corrected voice in system prompts, AND stores as a
   *  high-priority chunk for RAG retrieval. */
  const saveVoiceCorrections = async () => {
    // 1. Merge slider adjustments + freeform corrections into the existing voiceProfile
    const existingVoice = proxy?.voiceProfile ?? {};
    const updatedVoice: Record<string, unknown> = { ...existingVoice };

    // Map slider values to descriptive tone attributes
    const formalityDesc =
      sliders.formality <= 3 ? "formal and professional" :
      sliders.formality <= 7 ? "balanced — can be casual or professional" :
      "very casual and informal";
    const playfulnessDesc =
      sliders.playfulness <= 3 ? "serious and straightforward" :
      sliders.playfulness <= 7 ? "occasionally playful but mostly grounded" :
      "playful, witty, and loves banter";
    const verbosityDesc =
      sliders.verbosity <= 3 ? "extremely concise — one-liners preferred" :
      sliders.verbosity <= 7 ? "moderate length — a few sentences" :
      "detailed and thorough in explanations";

    updatedVoice.tone = formalityDesc;
    updatedVoice.communicationStyle = verbosityDesc;
    updatedVoice.humorStyle = playfulnessDesc;

    // Append freeform correction as a unique trait
    if (voiceCorrection.trim()) {
      const existing = Array.isArray(updatedVoice.uniqueTraits)
        ? (updatedVoice.uniqueTraits as string[])
        : [];
      updatedVoice.uniqueTraits = [
        ...existing,
        `Creator correction: ${voiceCorrection.trim()}`,
      ];
    }

    // 2. Patch the proxy record so the AI system prompt uses the updated voice
    const privyId = user?.id;
    if (privyId) {
      await fetch("/api/proxy", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ privyId, voiceProfile: updatedVoice }),
      });
    }

    // 3. Also store as a high-priority embedded chunk for RAG context
    const parts: string[] = [];
    parts.push(
      `[Creator Voice Preferences] Tone: ${formalityDesc}. Style: ${verbosityDesc}. Humor: ${playfulnessDesc}.`
    );
    if (voiceCorrection.trim()) {
      parts.push(`[Creator Voice Correction] ${voiceCorrection.trim()}`);
    }
    await submitChunk(parts.join("\n"));
  };

  /** Toggle a topic on/off */
  const toggleTopic = (tier: keyof TopicGroups, index: number) => {
    setTopics((prev) => {
      const updated = { ...prev };
      updated[tier] = [...updated[tier]];
      updated[tier][index] = {
        ...updated[tier][index],
        enabled: !updated[tier][index].enabled,
      };
      return updated;
    });
  };

  /** Add a custom topic */
  const addTopic = () => {
    if (!newTopic.trim()) return;
    setTopics((prev) => ({
      ...prev,
      medium: [...prev.medium, { name: newTopic.trim(), posts: 0, enabled: true }],
    }));
    setNewTopic("");
  };

  /** Send a test chat message to the real chat API */
  const sendChat = async () => {
    if (!chatInput.trim() || chatTyping || !proxy) return;
    const msg = chatInput.trim();
    setChatMessages((prev) => [...prev, { role: "user", text: msg }]);
    setChatInput("");
    setChatTyping(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proxyHandle: proxy.xHandle,
          messages: [{ role: "user", content: msg }],
          privyId: user?.id,
        }),
      });

      if (res.ok && res.body) {
        // Read the streamed response (plain text stream from toTextStreamResponse)
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullResponse = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          fullResponse += chunk;
        }

        setChatTyping(false);
        if (fullResponse) {
          setChatMessages((prev) => [...prev, { role: "proxy", text: fullResponse }]);
        } else {
          setChatMessages((prev) => [
            ...prev,
            { role: "proxy", text: "hmm, I couldn't come up with a response right now" },
          ]);
        }
      } else {
        setChatTyping(false);
        setChatMessages((prev) => [
          ...prev,
          { role: "proxy", text: "something went wrong, try again" },
        ]);
      }
    } catch {
      setChatTyping(false);
      setChatMessages((prev) => [
        ...prev,
        { role: "proxy", text: "couldn't reach the server, try again" },
      ]);
    }
  };

  /** Add a private knowledge item */
  const addKnowledge = async () => {
    if (!knowledgeInput.trim()) return;
    setKnowledgeSaving(true);
    try {
      await submitChunk(`[FAQ / Custom Knowledge]\n${knowledgeInput.trim()}`);
      setKnowledgeItems((prev) => [...prev, knowledgeInput.trim()]);
      setKnowledgeInput("");
    } finally {
      setKnowledgeSaving(false);
    }
  };

  /** Complete setup — save config, update brain with topic prefs, and redirect */
  const handleComplete = async () => {
    setSaving(true);
    try {
      const privyId = user?.id;

      // 1. Build updated coreBrain with topic preferences baked in
      const enabledTopics = [
        ...topics.strong.filter((t) => t.enabled).map((t) => t.name),
        ...topics.medium.filter((t) => t.enabled).map((t) => t.name),
        ...topics.weak.filter((t) => t.enabled).map((t) => t.name),
      ];
      const disabledTopics = [
        ...topics.strong.filter((t) => !t.enabled).map((t) => t.name),
        ...topics.medium.filter((t) => !t.enabled).map((t) => t.name),
        ...topics.weak.filter((t) => !t.enabled).map((t) => t.name),
      ];

      // Merge into existing coreBrain — keep all existing data, update topicMap
      const existingBrain = (proxy?.coreBrain ?? {}) as Record<string, unknown>;
      const existingTopicMap = (existingBrain.topicMap ?? {}) as Record<string, string[]>;

      // Remove disabled topics from topicMap, keep enabled ones
      const updatedTopicMap: Record<string, string[]> = {};
      for (const [topic, items] of Object.entries(existingTopicMap)) {
        if (!disabledTopics.includes(topic)) {
          updatedTopicMap[topic] = items;
        }
      }
      // Add any new custom topics the creator added (from medium tier with posts=0)
      for (const t of [...topics.strong, ...topics.medium, ...topics.weak]) {
        if (t.enabled && t.posts === 0 && !updatedTopicMap[t.name]) {
          updatedTopicMap[t.name] = []; // new custom topic
        }
      }

      const updatedBrain = {
        ...existingBrain,
        topicMap: updatedTopicMap,
      };

      // 2. Save chat price, ticker, AND updated coreBrain to the proxy record
      if (privyId) {
        await fetch("/api/proxy", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            privyId,
            coreBrain: updatedBrain,
            ...(chatPrice ? { chatPrice: parseFloat(chatPrice) } : {}),
            ...(ticker.trim() ? { ticker: ticker.trim().toUpperCase() } : {}),
          }),
        });
      }

      // 3. Also store topic preferences as an embedded chunk for RAG context
      if (enabledTopics.length > 0 || disabledTopics.length > 0) {
        await submitChunk(
          `[Creator Topic Preferences]\nI'm an expert in and want to discuss: ${enabledTopics.join(", ")}.\n${
            disabledTopics.length > 0
              ? `I prefer NOT to discuss or give opinions on: ${disabledTopics.join(", ")}.`
              : ""
          }`
        );
      }

      router.push(`/${handle}`);
    } catch {
      router.push(`/${handle}`);
    } finally {
      setSaving(false);
    }
  };

  // ─── Derived values ───
  const voiceSummary = proxy?.voiceProfile
    ? buildVoiceSummary(proxy.voiceProfile)
    : "Voice profile is being generated from your posts...";

  const topicsCount = proxy?.coreBrain?.topicMap
    ? Object.keys(proxy.coreBrain.topicMap).length
    : 0;

  const price = parseFloat(chatPrice) || 0;
  const creatorPct = CREATOR_FEE_PERCENT / 100;
  const dailyEarnings = (price * 100 * creatorPct).toFixed(0);
  const monthlyEarnings = (price * 100 * 30 * creatorPct).toFixed(0);

  // ─── Loading state ───
  if (!ready || !authChecked || !proxy) {
    return (
      <>
        <style>{styles}</style>
        <div className="setup-loading">
          <div className="setup-spinner" />
        </div>
      </>
    );
  }

  // ─── Render ───
  return (
    <>
      <style>{styles}</style>
      <div className="proxi-setup">
        <div className="setup-container">
          {/* Logo */}
          <div className="setup-header">
            <div className="setup-logo">
              PROXI<span>agent</span>
            </div>

            {step === -1 ? (
              <div className="fade-in">
                <div className="setup-title">Your Proxy is Already Live</div>
                <div className="setup-subtitle">
                  We built your clone and launched your token. Complete setup to
                  customize your proxy and claim your fees.
                </div>
              </div>
            ) : (
              <>
                <div className="setup-title fade-in">
                  {step === 0 && "How Your Clone Sounds"}
                  {step === 1 && "What Your Clone Knows"}
                  {step === 2 && "Teach It More"}
                  {step === 3 && "Set Pricing & Earn"}
                </div>
                <div className="setup-subtitle fade-in">
                  {step === 0 &&
                    "Review the auto-generated voice profile — tweak anything that's off."}
                  {step === 1 &&
                    "We mapped your expertise from your posts. Toggle topics on or off."}
                  {step === 2 && "Add private knowledge your clone can't learn from X."}
                  {step === 3 && "Configure your chat price and start earning."}
                </div>
              </>
            )}
          </div>

          {/* Progress (hidden on wow screen) */}
          {step >= 0 && (
            <div className="progress-bar fade-in">
              {STEP_LABELS.map((label, i) => (
                <div key={label} className="progress-segment">
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{ width: i <= step ? "100%" : "0%" }}
                    />
                  </div>
                  <span
                    className={`progress-label ${
                      i === step ? "active" : i < step ? "done" : "pending"
                    }`}
                  >
                    {label}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* ── Step -1: Overview / Wow ── */}
          {step === -1 && (
            <div className="setup-card fade-in">
              {/* Token info banner */}
              {proxy.tokenAddress && (
                <div className="unclaimed-banner stagger-1 fade-in">
                  <div className="unclaimed-label">
                    {proxy.ticker ? `$${proxy.ticker}` : "Your Token"} is Live
                  </div>
                  <div className="unclaimed-amount">
                    ${(proxy.marketCap ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                  <div className="unclaimed-sub">
                    Market cap since your proxy went live{" "}
                    <strong>{timeAgo(proxy.createdAt)} ago</strong>
                  </div>
                </div>
              )}

              {/* Token stats */}
              <div className="token-row stagger-2 fade-in">
                <div className="token-stat">
                  <div className="token-stat-value">
                    ${(proxy.marketCap ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                  <div className="token-stat-label">Market Cap</div>
                </div>
                <div className="token-stat">
                  <div className="token-stat-value">{proxy.totalChats}</div>
                  <div className="token-stat-label">Chats</div>
                </div>
                <div className="token-stat">
                  <div className="token-stat-value">{proxy.totalMessages}</div>
                  <div className="token-stat-label">Messages</div>
                </div>
                <div className="token-stat">
                  <div className="token-stat-value">
                    ${(proxy.price ?? 0).toFixed(4)}
                  </div>
                  <div className="token-stat-label">Token Price</div>
                </div>
              </div>

              {/* Brain stats */}
              <div className="wow-stats stagger-3 fade-in">
                <div className="wow-stat">
                  <div className="wow-stat-num">
                    {proxy.postsAnalyzed.toLocaleString()}
                  </div>
                  <div className="wow-stat-label">Posts Analyzed</div>
                </div>
                <div className="wow-stat">
                  <div className="wow-stat-num">{topicsCount}</div>
                  <div className="wow-stat-label">Topics Found</div>
                </div>
                <div className="wow-stat">
                  <div className="wow-stat-num">
                    {proxy.voiceProfile ? "100%" : "—"}
                  </div>
                  <div className="wow-stat-label">Voice Match</div>
                </div>
              </div>

              {/* Voice preview */}
              <div className="wow-preview stagger-3 fade-in">
                <div className="wow-preview-label">Voice Preview</div>
                <div className="wow-preview-text">&ldquo;{voiceSummary}&rdquo;</div>
              </div>

              <div className="wow-actions stagger-4 fade-in">
                <button className="btn btn-lime" onClick={() => setStep(0)}>
                  Set Up Proxy →
                </button>
              </div>
            </div>
          )}

          {/* ── Step 0: Voice Review ── */}
          {step === 0 && (
            <div className="setup-card fade-in">
              {voiceApproved && (
                <div className="approved-badge">✓ Voice Approved</div>
              )}

              <div className="voice-profile-box">
                &ldquo;{voiceSummary}&rdquo;
              </div>

              {!voiceApproved && !showSliders && (
                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    className="btn btn-lime"
                    style={{ flex: 1, justifyContent: "center" }}
                    onClick={() => setVoiceApproved(true)}
                  >
                    ✓ Sounds Like Me
                  </button>
                  <button
                    className="btn btn-outline"
                    style={{ flex: 1, justifyContent: "center" }}
                    onClick={() => setShowSliders(true)}
                  >
                    Tweak It
                  </button>
                </div>
              )}

              {showSliders && !voiceApproved && (
                <div className="fade-in">
                  <div className="voice-sliders">
                    <div className="slider-row">
                      <div className="slider-labels">
                        <span>More Formal</span>
                        <span>More Casual</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={sliders.formality}
                        onChange={(e) =>
                          setSliders((s) => ({
                            ...s,
                            formality: +e.target.value,
                          }))
                        }
                        className="slider-track"
                      />
                    </div>
                    <div className="slider-row">
                      <div className="slider-labels">
                        <span>More Serious</span>
                        <span>More Playful</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={sliders.playfulness}
                        onChange={(e) =>
                          setSliders((s) => ({
                            ...s,
                            playfulness: +e.target.value,
                          }))
                        }
                        className="slider-track"
                      />
                    </div>
                    <div className="slider-row">
                      <div className="slider-labels">
                        <span>Shorter Replies</span>
                        <span>Longer Replies</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={sliders.verbosity}
                        onChange={(e) =>
                          setSliders((s) => ({
                            ...s,
                            verbosity: +e.target.value,
                          }))
                        }
                        className="slider-track"
                      />
                    </div>
                  </div>

                  <textarea
                    className="voice-correction"
                    value={voiceCorrection}
                    onChange={(e) => setVoiceCorrection(e.target.value)}
                    placeholder="Anything else we got wrong? e.g. 'I'm more sarcastic than that' or 'I never say ser'"
                  />

                  <div style={{ marginTop: 14 }}>
                    <button
                      className="btn btn-lime"
                      onClick={async () => {
                        await saveVoiceCorrections();
                        setVoiceApproved(true);
                        setShowSliders(false);
                      }}
                    >
                      ✓ Save & Approve
                    </button>
                  </div>
                </div>
              )}

              <div className="btn-row">
                <button className="btn btn-ghost" onClick={() => setStep(-1)}>
                  ← Back
                </button>
                <button className="btn btn-lime" onClick={() => setStep(1)}>
                  Next →
                </button>
              </div>
            </div>
          )}

          {/* ── Step 1: Knowledge / Topics Review ── */}
          {step === 1 && (
            <div className="setup-card fade-in">
              {/* Strong */}
              {topics.strong.length > 0 && (
                <div className="topic-section">
                  <div className="topic-section-header">
                    <div className="topic-dot green" />
                    <span className="topic-section-title">
                      Strong — can go deep
                    </span>
                  </div>
                  <div className="topic-tags">
                    {topics.strong.map((t, i) => (
                      <div
                        key={t.name}
                        className={`topic-tag ${t.enabled ? "enabled" : "disabled"}`}
                        onClick={() => toggleTopic("strong", i)}
                      >
                        <span className="toggle-icon">
                          {t.enabled ? "✓" : "＋"}
                        </span>
                        {t.name}
                        {t.posts > 0 && (
                          <span className="post-count">{t.posts}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Medium */}
              {topics.medium.length > 0 && (
                <div className="topic-section">
                  <div className="topic-section-header">
                    <div className="topic-dot yellow" />
                    <span className="topic-section-title">
                      Medium — has some takes
                    </span>
                  </div>
                  <div className="topic-tags">
                    {topics.medium.map((t, i) => (
                      <div
                        key={t.name}
                        className={`topic-tag ${t.enabled ? "enabled" : "disabled"}`}
                        onClick={() => toggleTopic("medium", i)}
                      >
                        <span className="toggle-icon">
                          {t.enabled ? "✓" : "＋"}
                        </span>
                        {t.name}
                        <span className="post-count">
                          {t.posts > 0 ? t.posts : "new"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Weak */}
              {topics.weak.length > 0 && (
                <div className="topic-section">
                  <div className="topic-section-header">
                    <div className="topic-dot red" />
                    <span className="topic-section-title">
                      Weak — will queue to you
                    </span>
                  </div>
                  <div className="topic-tags">
                    {topics.weak.map((t, i) => (
                      <div
                        key={t.name}
                        className={`topic-tag ${t.enabled ? "enabled" : "disabled"}`}
                        onClick={() => toggleTopic("weak", i)}
                      >
                        <span className="toggle-icon">
                          {t.enabled ? "✓" : "×"}
                        </span>
                        {t.name}
                        <span className="post-count">{t.posts}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No topics fallback */}
              {topics.strong.length === 0 &&
                topics.medium.length === 0 &&
                topics.weak.length === 0 && (
                  <div className="card-desc" style={{ textAlign: "center" }}>
                    No topics found yet. Add some below or continue to the next
                    step.
                  </div>
                )}

              {/* Add topic */}
              <div className="add-topic-row">
                <input
                  className="add-topic-input"
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  placeholder="Add a topic your clone should know about..."
                  onKeyDown={(e) => e.key === "Enter" && addTopic()}
                />
                <button
                  className="btn btn-outline"
                  onClick={addTopic}
                  style={{ borderRadius: 100, padding: "10px 18px" }}
                >
                  + Add
                </button>
              </div>

              {/* Test chat */}
              <div className="test-chat">
                <div className="test-chat-label">Test your clone</div>
                <div className="chat-messages">
                  {chatMessages.length === 0 && (
                    <div
                      style={{
                        textAlign: "center",
                        color: "rgba(255,255,255,0.15)",
                        fontSize: "0.82rem",
                        padding: "16px 0",
                      }}
                    >
                      Ask your clone something to see how it responds
                    </div>
                  )}
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`chat-msg ${msg.role}`}>
                      {msg.text}
                    </div>
                  ))}
                  {chatTyping && (
                    <div className="chat-msg proxy typing">
                      <span className="dots">
                        <span>●</span> <span>●</span> <span>●</span>
                      </span>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
                <div className="chat-input-row">
                  <input
                    className="chat-input"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask your clone something..."
                    onKeyDown={(e) => e.key === "Enter" && sendChat()}
                  />
                  <button
                    className="chat-send"
                    onClick={sendChat}
                    disabled={!chatInput.trim() || chatTyping}
                  >
                    ↑
                  </button>
                </div>
              </div>

              <div className="btn-row">
                <button className="btn btn-ghost" onClick={() => setStep(0)}>
                  ← Back
                </button>
                <button className="btn btn-lime" onClick={() => setStep(2)}>
                  Next →
                </button>
              </div>
            </div>
          )}

          {/* ── Step 2: Private Knowledge ── */}
          {step === 2 && (
            <div className="setup-card fade-in">
              <div className="card-title">Private Knowledge</div>
              <div className="card-desc">
                Add notes, FAQs, or knowledge your clone should know but you
                haven&apos;t posted about on X.
              </div>

              {knowledgeItems.length > 0 && (
                <div className="knowledge-items">
                  {knowledgeItems.map((item, i) => (
                    <div key={i} className="knowledge-item">
                      <div className="knowledge-check">✓</div>
                      <div className="knowledge-text">{item}</div>
                    </div>
                  ))}
                </div>
              )}

              <textarea
                className="knowledge-textarea"
                value={knowledgeInput}
                onChange={(e) => setKnowledgeInput(e.target.value)}
                placeholder="e.g. Q: What's your investment thesis? A: I'm long on infra, short on attention tokens..."
              />
              <button
                className="btn btn-outline"
                onClick={addKnowledge}
                disabled={!knowledgeInput.trim() || knowledgeSaving}
                style={{ fontSize: "0.82rem" }}
              >
                {knowledgeSaving ? "Saving..." : "+ Add Item"}
              </button>

              <div className="knowledge-examples">
                <div className="knowledge-examples-title">What to add here</div>
                <div className="knowledge-example">
                  • Projects you&apos;re building that aren&apos;t public yet
                </div>
                <div className="knowledge-example">
                  • Opinions you hold but haven&apos;t tweeted about
                </div>
                <div className="knowledge-example">
                  • Common questions people ask you in DMs
                </div>
                <div className="knowledge-example">
                  • Your background, skills, or experience details
                </div>
              </div>

              <div className="btn-row">
                <button className="btn btn-ghost" onClick={() => setStep(1)}>
                  ← Back
                </button>
                <button className="btn btn-lime" onClick={() => setStep(3)}>
                  Next →
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Config ── */}
          {step === 3 && (
            <div className="setup-card fade-in">
              <div className="config-field">
                <label className="config-label">
                  Chat Price (USD per message)
                </label>
                <input
                  type="number"
                  className="config-input"
                  value={chatPrice}
                  onChange={(e) => setChatPrice(e.target.value)}
                  placeholder="0.10"
                  min="0"
                  step="0.01"
                />
                <div className="config-hint">
                  Chatters pay this in USDC for each message to your proxy
                </div>
              </div>

              <div className="earnings-preview">
                <div className="earnings-title">Projected Earnings</div>
                <div className="earnings-rows">
                  <div className="earnings-row">
                    <span className="label">Price per message</span>
                    <span className="value">${price.toFixed(2)}</span>
                  </div>
                  <div className="earnings-row">
                    <span className="label">At 100 chats/day</span>
                    <span className="value lime">
                      ~${dailyEarnings}/day · ${monthlyEarnings}/mo
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 8 }}>
                <div
                  style={{
                    fontSize: "0.72rem",
                    color: "#8888A0",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    marginBottom: 8,
                  }}
                >
                  Token Fee Split
                </div>
                <div className="fee-split">
                  <div className="fee-split-bar creator">
                    {CREATOR_FEE_PERCENT}% You
                  </div>
                  <div className="fee-split-bar protocol">
                    {100 - CREATOR_FEE_PERCENT}% Protocol
                  </div>
                </div>
              </div>

              <div className="btn-row">
                <button className="btn btn-ghost" onClick={() => setStep(2)}>
                  ← Back
                </button>
                <button
                  className="btn btn-lime"
                  onClick={handleComplete}
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : "Complete Setup & Start Earning →"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
