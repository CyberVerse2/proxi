import { useState, useEffect, useRef } from 'react';

// ── Mock data simulating what the ingestion pipeline would produce ──
const MOCK_VOICE_PROFILE = {
  summary: `writes in lowercase with minimal punctuation. keeps most takes to 1-2 sentences. uses crypto slang heavily — "ser", "ngmi", "lfg". switches to precise technical language when explaining protocols. humor is dry and deadpan. never uses exclamation marks unironically. starts opinions with "ngl" or "the play is". avoids formal language entirely.`,
  tone: { formality: 2, playfulness: 7, verbosity: 3 }
};

const MOCK_TOPICS = {
  strong: [
    { name: 'DeFi Protocols', posts: 284, enabled: true },
    { name: 'L2 Infrastructure', posts: 196, enabled: true },
    { name: 'Tokenomics', posts: 142, enabled: true },
    { name: 'Smart Contracts', posts: 118, enabled: true }
  ],
  medium: [
    { name: 'AI Agents', posts: 63, enabled: true },
    { name: 'Startup Culture', posts: 47, enabled: true },
    { name: 'Farcaster', posts: 38, enabled: true },
    { name: 'Base Ecosystem', posts: 29, enabled: true }
  ],
  weak: [
    { name: 'Personal Life', posts: 12, enabled: false },
    { name: 'Music', posts: 8, enabled: false },
    { name: 'Fitness', posts: 5, enabled: false }
  ]
};

const MOCK_STATS = { totalPosts: 18429, topicsFound: 142, voiceConfidence: 94 };

const MOCK_TOKEN = {
  ticker: '$DEGEN',
  unclaimedFees: 47.82,
  marketCap: 12480,
  holders: 34,
  chatsSinceCreation: 289,
  hoursLive: 6.5,
  priceUsd: 0.0124
};

const MOCK_CHAT_RESPONSES = [
  "ngl the current state of L2 sequencer decentralization is still pretty early. most L2s are running centralized sequencers and just pointing to their roadmap. the real question is whether economic incentives or governance will drive decentralization first — i think it's gonna be economics",
  "tokenomics is basically incentive design. you're building a system where rational actors do what you want because it's profitable for them. most projects mess this up by optimizing for token price instead of protocol usage",
  "hmm haven't really gotten into that — flagging it for the real me"
];

// ── Styles ──
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

  /* ── Step 2: Test Chat ── */
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
    width: 50%;
  }

  .fee-split-bar.protocol {
    background: linear-gradient(90deg, #7C65C1, #8A63D2);
    color: #F5F5F0;
    width: 50%;
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

  /* ── Responsive ── */
  @media (max-width: 480px) {
    .setup-card { padding: 24px 18px; }
    .wow-stats { grid-template-columns: repeat(3, 1fr); gap: 8px; }
    .wow-stat { padding: 14px 8px; }
    .wow-stat-num { font-size: 1.2rem; }
    .wow-actions { flex-direction: column; }
  }
`;

const STEP_LABELS = ['Voice', 'Knowledge', 'Private Data', 'Config'];

export default function ProxiSetup() {
  const [step, setStep] = useState(-1); // -1 = wow screen
  const [voiceApproved, setVoiceApproved] = useState(false);
  const [showSliders, setShowSliders] = useState(false);
  const [sliders, setSliders] = useState(MOCK_VOICE_PROFILE.tone);
  const [voiceCorrection, setVoiceCorrection] = useState('');

  const [topics, setTopics] = useState(MOCK_TOPICS);
  const [newTopic, setNewTopic] = useState('');

  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatTyping, setChatTyping] = useState(false);
  const chatResponseIdx = useRef(0);
  const chatEndRef = useRef(null);

  const [knowledgeItems, setKnowledgeItems] = useState([]);
  const [knowledgeInput, setKnowledgeInput] = useState('');

  const [chatPrice, setChatPrice] = useState('0.10');
  const [ticker, setTicker] = useState('DEGEN');

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatTyping]);

  const toggleTopic = (tier, index) => {
    setTopics((prev) => {
      const updated = { ...prev };
      updated[tier] = [...updated[tier]];
      updated[tier][index] = {
        ...updated[tier][index],
        enabled: !updated[tier][index].enabled
      };
      return updated;
    });
  };

  const addTopic = () => {
    if (!newTopic.trim()) return;
    setTopics((prev) => ({
      ...prev,
      medium: [...prev.medium, { name: newTopic.trim(), posts: 0, enabled: true }]
    }));
    setNewTopic('');
  };

  const sendChat = () => {
    if (!chatInput.trim() || chatTyping) return;
    const msg = chatInput.trim();
    setChatMessages((prev) => [...prev, { role: 'user', text: msg }]);
    setChatInput('');
    setChatTyping(true);
    setTimeout(
      () => {
        const response = MOCK_CHAT_RESPONSES[chatResponseIdx.current % MOCK_CHAT_RESPONSES.length];
        chatResponseIdx.current++;
        setChatTyping(false);
        setChatMessages((prev) => [...prev, { role: 'proxy', text: response }]);
      },
      1500 + Math.random() * 1000
    );
  };

  const addKnowledge = () => {
    if (!knowledgeInput.trim()) return;
    setKnowledgeItems((prev) => [...prev, knowledgeInput.trim()]);
    setKnowledgeInput('');
  };

  const price = parseFloat(chatPrice) || 0;
  const dailyEarnings = (price * 100 * 0.5).toFixed(0);
  const monthlyEarnings = (price * 100 * 30 * 0.5).toFixed(0);

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
                  We built your clone and launched your token. People are already chatting and
                  trading. Complete setup to claim your fees.
                </div>
              </div>
            ) : (
              <>
                <div className="setup-title fade-in">
                  {step === 0 && 'How Your Clone Sounds'}
                  {step === 1 && 'What Your Clone Knows'}
                  {step === 2 && 'Teach It More'}
                  {step === 3 && 'Set Pricing & Earn'}
                </div>
                <div className="setup-subtitle fade-in">
                  {step === 0 &&
                    "Review the auto-generated voice profile — tweak anything that's off."}
                  {step === 1 &&
                    'We mapped your expertise from your posts. Toggle topics on or off.'}
                  {step === 2 && "Add private knowledge your clone can't learn from X."}
                  {step === 3 && 'Configure your chat price and start earning.'}
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
                    <div className="progress-fill" style={{ width: i <= step ? '100%' : '0%' }} />
                  </div>
                  <span
                    className={`progress-label ${
                      i === step ? 'active' : i < step ? 'done' : 'pending'
                    }`}
                  >
                    {label}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* ── Step -1: Wow ── */}
          {step === -1 && (
            <div className="setup-card fade-in">
              {/* Unclaimed Fees — the hook */}
              <div className="unclaimed-banner stagger-1 fade-in">
                <div className="unclaimed-label">💰 Unclaimed Fees</div>
                <div className="unclaimed-amount">${MOCK_TOKEN.unclaimedFees.toFixed(2)}</div>
                <div className="unclaimed-sub">
                  <strong>{MOCK_TOKEN.ticker}</strong> has been trading for {MOCK_TOKEN.hoursLive}h
                  since your proxy went live
                </div>
              </div>

              {/* Token stats */}
              <div className="token-row stagger-2 fade-in">
                <div className="token-stat">
                  <div className="token-stat-value">${MOCK_TOKEN.marketCap.toLocaleString()}</div>
                  <div className="token-stat-label">Market Cap</div>
                </div>
                <div className="token-stat">
                  <div className="token-stat-value">{MOCK_TOKEN.holders}</div>
                  <div className="token-stat-label">Holders</div>
                </div>
                <div className="token-stat">
                  <div className="token-stat-value">{MOCK_TOKEN.chatsSinceCreation}</div>
                  <div className="token-stat-label">Chats</div>
                </div>
                <div className="token-stat">
                  <div className="token-stat-value">${MOCK_TOKEN.priceUsd}</div>
                  <div className="token-stat-label">Token Price</div>
                </div>
              </div>

              {/* Brain stats */}
              <div className="wow-stats stagger-3 fade-in">
                <div className="wow-stat">
                  <div className="wow-stat-num">{MOCK_STATS.totalPosts.toLocaleString()}</div>
                  <div className="wow-stat-label">Posts Analyzed</div>
                </div>
                <div className="wow-stat">
                  <div className="wow-stat-num">{MOCK_STATS.topicsFound}</div>
                  <div className="wow-stat-label">Topics Found</div>
                </div>
                <div className="wow-stat">
                  <div className="wow-stat-num">{MOCK_STATS.voiceConfidence}%</div>
                  <div className="wow-stat-label">Voice Match</div>
                </div>
              </div>

              <div className="wow-preview stagger-3 fade-in">
                <div className="wow-preview-label">🗣️ Voice Preview</div>
                <div className="wow-preview-text">"{MOCK_VOICE_PROFILE.summary}"</div>
              </div>

              <div className="wow-actions stagger-4 fade-in">
                <button className="btn btn-lime" onClick={() => setStep(0)}>
                  Claim Fees & Set Up Proxy →
                </button>
              </div>
            </div>
          )}

          {/* ── Step 0: Voice Review ── */}
          {step === 0 && (
            <div className="setup-card fade-in">
              {voiceApproved && <div className="approved-badge">✓ Voice Approved</div>}

              <div className="voice-profile-box">"{MOCK_VOICE_PROFILE.summary}"</div>

              {!voiceApproved && !showSliders && (
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    className="btn btn-lime"
                    style={{ flex: 1, justifyContent: 'center' }}
                    onClick={() => setVoiceApproved(true)}
                  >
                    ✓ Sounds Like Me
                  </button>
                  <button
                    className="btn btn-outline"
                    style={{ flex: 1, justifyContent: 'center' }}
                    onClick={() => setShowSliders(true)}
                  >
                    ✏️ Tweak It
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
                            formality: +e.target.value
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
                            playfulness: +e.target.value
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
                            verbosity: +e.target.value
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
                      onClick={() => {
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

          {/* ── Step 1: Knowledge Review ── */}
          {step === 1 && (
            <div className="setup-card fade-in">
              {/* Strong */}
              <div className="topic-section">
                <div className="topic-section-header">
                  <div className="topic-dot green" />
                  <span className="topic-section-title">Strong — can go deep</span>
                </div>
                <div className="topic-tags">
                  {topics.strong.map((t, i) => (
                    <div
                      key={t.name}
                      className={`topic-tag ${t.enabled ? 'enabled' : 'disabled'}`}
                      onClick={() => toggleTopic('strong', i)}
                    >
                      <span className="toggle-icon">{t.enabled ? '✓' : '＋'}</span>
                      {t.name}
                      <span className="post-count">{t.posts}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Medium */}
              <div className="topic-section">
                <div className="topic-section-header">
                  <div className="topic-dot yellow" />
                  <span className="topic-section-title">Medium — has some takes</span>
                </div>
                <div className="topic-tags">
                  {topics.medium.map((t, i) => (
                    <div
                      key={t.name}
                      className={`topic-tag ${t.enabled ? 'enabled' : 'disabled'}`}
                      onClick={() => toggleTopic('medium', i)}
                    >
                      <span className="toggle-icon">{t.enabled ? '✓' : '＋'}</span>
                      {t.name}
                      <span className="post-count">{t.posts > 0 ? t.posts : 'new'}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Weak */}
              <div className="topic-section">
                <div className="topic-section-header">
                  <div className="topic-dot red" />
                  <span className="topic-section-title">Weak — will queue to you</span>
                </div>
                <div className="topic-tags">
                  {topics.weak.map((t, i) => (
                    <div
                      key={t.name}
                      className={`topic-tag ${t.enabled ? 'enabled' : 'disabled'}`}
                      onClick={() => toggleTopic('weak', i)}
                    >
                      <span className="toggle-icon">{t.enabled ? '✓' : '×'}</span>
                      {t.name}
                      <span className="post-count">{t.posts}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add topic */}
              <div className="add-topic-row">
                <input
                  className="add-topic-input"
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  placeholder="Add a topic your clone should know about..."
                  onKeyDown={(e) => e.key === 'Enter' && addTopic()}
                />
                <button
                  className="btn btn-outline"
                  onClick={addTopic}
                  style={{ borderRadius: 100, padding: '10px 18px' }}
                >
                  + Add
                </button>
              </div>

              {/* Test chat */}
              <div className="test-chat">
                <div className="test-chat-label">💬 Test your clone</div>
                <div className="chat-messages">
                  {chatMessages.length === 0 && (
                    <div
                      style={{
                        textAlign: 'center',
                        color: 'rgba(255,255,255,0.15)',
                        fontSize: '0.82rem',
                        padding: '16px 0'
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
                    onKeyDown={(e) => e.key === 'Enter' && sendChat()}
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
                Add notes, FAQs, or knowledge your clone should know but you haven't posted about on
                X.
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
                disabled={!knowledgeInput.trim()}
                style={{ fontSize: '0.82rem' }}
              >
                + Add Item
              </button>

              <div className="knowledge-examples">
                <div className="knowledge-examples-title">💡 What to add here</div>
                <div className="knowledge-example">
                  • Projects you're building that aren't public yet
                </div>
                <div className="knowledge-example">
                  • Opinions you hold but haven't tweeted about
                </div>
                <div className="knowledge-example">• Common questions people ask you in DMs</div>
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
                <label className="config-label">Chat Price (USD per message)</label>
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

              <div className="config-field">
                <label className="config-label">Token Ticker</label>
                <input
                  type="text"
                  className="config-input"
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value.toUpperCase())}
                  placeholder="$HANDLE"
                  maxLength={10}
                />
                <div className="config-hint">
                  Your agent's token on Base — tradeable on Clanker / Flaunch
                </div>
              </div>

              <div className="earnings-preview">
                <div className="earnings-title">💰 Projected Earnings</div>
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
                    fontSize: '0.72rem',
                    color: '#8888A0',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    marginBottom: 8
                  }}
                >
                  Token Fee Split
                </div>
                <div className="fee-split">
                  <div className="fee-split-bar creator">50% You</div>
                  <div className="fee-split-bar protocol">50% Protocol</div>
                </div>
              </div>

              <div className="btn-row">
                <button className="btn btn-ghost" onClick={() => setStep(2)}>
                  ← Back
                </button>
                <button
                  className="btn btn-lime"
                  onClick={() =>
                    alert('🎉 Proxy setup complete! Redirecting to your agent page...')
                  }
                >
                  Complete Setup & Start Earning →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
