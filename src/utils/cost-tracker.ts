/**
 * Cost tracking utility for API usage
 * Tracks costs for Gemini chat and TTS API calls
 */

import logger from './logger';

/**
 * Gemini API pricing (as of 2025)
 * Note: These are example rates - update with actual pricing
 */
const PRICING = {
  // Gemini 2.0 Flash pricing per 1M tokens
  geminiFlash: {
    input: 0.075,  // $0.075 per 1M input tokens
    output: 0.30,  // $0.30 per 1M output tokens
  },
  // Gemini 2.5 Pro TTS pricing per 1M characters
  geminiTTS: {
    characters: 16.00, // $16 per 1M characters
  },
  // OpenAI Realtime API (gpt-4o-realtime-preview) pricing
  // IMPORTANT: Replace these with actual current OpenAI rates
  openaiRealtime: {
    inputText: 0.005 / 1000,   // Example: $5 per 1M input text tokens
    inputAudio: 0.00017 / 60, // Example: $0.00017 per second of audio (approx, needs conversion to tokens or per-second rate)
                               // OpenAI might bill audio differently (e.g., per second or per audio token)
                               // For gpt-4o, audio input is $0.0075 / 1M tokens. Let's use token based for now.
    inputAudioTokens: 0.0075 / 1_000_000, // $7.50 per 1M input audio tokens
    outputText: 0.015 / 1000,  // Example: $15 per 1M output text tokens
    outputAudioTokens: 0.015 / 1_000_000, // $15.00 per 1M output audio tokens
  }
};

/**
 * Session cost tracker
 */
export interface SessionCost {
  sessionId: string;
  startTime: Date;
  endTime?: Date;
  chatCosts: { // For Gemini or other general chat models
    inputTokens: number;
    outputTokens: number;
    totalCost: number;
  };
  ttsCosts: { // For Gemini or other general TTS models
    characters: number;
    totalCost: number;
  };
  openAICosts?: { // Specifically for OpenAI Realtime API
    inputTextTokens: number;
    inputAudioTokens: number;
    outputTextTokens: number;
    outputAudioTokens: number;
    totalInputTextCost: number;
    totalInputAudioCost: number;
    totalOutputTextCost: number;
    totalOutputAudioCost: number;
    totalCost: number;
  };
  totalCost: number;
}

/**
 * Cost tracking service
 */
export class CostTracker {
  private sessions: Map<string, SessionCost> = new Map();

  /**
   * Start tracking a new session
   */
  startSession(sessionId: string): void {
    this.sessions.set(sessionId, {
      sessionId,
      startTime: new Date(),
      chatCosts: {
        inputTokens: 0,
        outputTokens: 0,
        totalCost: 0,
      },
      ttsCosts: {
        characters: 0,
        totalCost: 0,
      },
      openAICosts: {
        inputTextTokens: 0,
        inputAudioTokens: 0,
        outputTextTokens: 0,
        outputAudioTokens: 0,
        totalInputTextCost: 0,
        totalInputAudioCost: 0,
        totalOutputTextCost: 0,
        totalOutputAudioCost: 0,
        totalCost: 0,
      },
      totalCost: 0,
    });
    
    logger.info('Started cost tracking for session', { sessionId });
  }

  /**
   * Track chat API usage
   * Note: Token counting is approximate - use tiktoken for accurate counts
   */
  trackChatUsage(sessionId: string, input: string, output: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // Approximate token count (1 token ≈ 4 characters)
    const inputTokens = Math.ceil(input.length / 4);
    const outputTokens = Math.ceil(output.length / 4);

    // Calculate costs (convert to cost per token)
    const inputCost = (inputTokens / 1_000_000) * PRICING.geminiFlash.input;
    const outputCost = (outputTokens / 1_000_000) * PRICING.geminiFlash.output;

    session.chatCosts.inputTokens += inputTokens;
    session.chatCosts.outputTokens += outputTokens;
    session.chatCosts.totalCost += inputCost + outputCost;
    session.totalCost += inputCost + outputCost;

    logger.info('Tracked chat usage', {
      sessionId,
      inputTokens,
      outputTokens,
      cost: inputCost + outputCost,
      totalSessionCost: session.totalCost,
    });
  }

  /**
   * Track TTS API usage
   */
  trackTTSUsage(sessionId: string, text: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const characters = text.length;
    const cost = (characters / 1_000_000) * PRICING.geminiTTS.characters;

    session.ttsCosts.characters += characters;
    session.ttsCosts.totalCost += cost;
    session.totalCost += cost;

    logger.info('Tracked TTS usage', {
      sessionId,
      characters,
      cost,
      totalSessionCost: session.totalCost,
    });
  }

  /**
   * Track OpenAI Realtime API usage
   */
  trackOpenAIRealtimeUsage(sessionId: string, usage: any): void {
    const session = this.sessions.get(sessionId);
    if (!session || !usage) return;

    if (!session.openAICosts) {
      session.openAICosts = {
        inputTextTokens: 0,
        inputAudioTokens: 0,
        outputTextTokens: 0,
        outputAudioTokens: 0,
        totalInputTextCost: 0,
        totalInputAudioCost: 0,
        totalOutputTextCost: 0,
        totalOutputAudioCost: 0,
        totalCost: 0,
      };
    }

    const inputTextTokens = usage.input_token_details?.text_tokens || 0;
    const inputAudioTokens = usage.input_token_details?.audio_tokens || 0;
    const outputTextTokens = usage.output_token_details?.text_tokens || 0;
    const outputAudioTokens = usage.output_token_details?.audio_tokens || 0;

    const inputTextCost = inputTextTokens * PRICING.openaiRealtime.inputAudioTokens; // Assuming text tokens are priced like audio for simplicity, update if different
    const inputAudioCost = inputAudioTokens * PRICING.openaiRealtime.inputAudioTokens;
    const outputTextCost = outputTextTokens * PRICING.openaiRealtime.outputAudioTokens; // Assuming text tokens are priced like audio
    const outputAudioCost = outputAudioTokens * PRICING.openaiRealtime.outputAudioTokens;
    
    const currentTurnCost = inputTextCost + inputAudioCost + outputTextCost + outputAudioCost;

    session.openAICosts.inputTextTokens += inputTextTokens;
    session.openAICosts.inputAudioTokens += inputAudioTokens;
    session.openAICosts.outputTextTokens += outputTextTokens;
    session.openAICosts.outputAudioTokens += outputAudioTokens;

    session.openAICosts.totalInputTextCost += inputTextCost;
    session.openAICosts.totalInputAudioCost += inputAudioCost;
    session.openAICosts.totalOutputTextCost += outputTextCost;
    session.openAICosts.totalOutputAudioCost += outputAudioCost;
    session.openAICosts.totalCost += currentTurnCost;
    session.totalCost += currentTurnCost;

    logger.info('Tracked OpenAI Realtime usage', {
      sessionId,
      inputTextTokens,
      inputAudioTokens,
      outputTextTokens,
      outputAudioTokens,
      turnCost: currentTurnCost,
      totalOpenAICost: session.openAICosts.totalCost,
      totalSessionCost: session.totalCost,
    });
  }

  /**
   * End session and get final cost
   */
  endSession(sessionId: string): SessionCost | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    session.endTime = new Date();
    
    logger.info('Session cost summary', {
      sessionId,
      duration: session.endTime.getTime() - session.startTime.getTime(),
      chatInputTokens: session.chatCosts.inputTokens,
      chatOutputTokens: session.chatCosts.outputTokens,
      chatCost: session.chatCosts.totalCost,
      ttsCharacters: session.ttsCosts.characters,
      ttsCost: session.ttsCosts.totalCost,
      openAIInputTextTokens: session.openAICosts?.inputTextTokens || 0,
      openAIInputAudioTokens: session.openAICosts?.inputAudioTokens || 0,
      openAIOutputTextTokens: session.openAICosts?.outputTextTokens || 0,
      openAIOutputAudioTokens: session.openAICosts?.outputAudioTokens || 0,
      openAICost: session.openAICosts?.totalCost || 0,
      totalCost: session.totalCost,
    });

    return session;
  }

  /**
   * Get current session cost
   */
  getSessionCost(sessionId: string): SessionCost | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Get all sessions
   */
  getAllSessions(): SessionCost[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Calculate total costs across all sessions
   */
  getTotalCosts(): {
    totalSessions: number;
    totalCost: number;
    totalChatCost: number;
    totalTTSCost: number;
    totalOpenAICost: number;
  } {
    const sessions = this.getAllSessions();
    
    return {
      totalSessions: sessions.length,
      totalCost: sessions.reduce((sum, s) => sum + s.totalCost, 0),
      totalChatCost: sessions.reduce((sum, s) => sum + s.chatCosts.totalCost, 0),
      totalTTSCost: sessions.reduce((sum, s) => sum + s.ttsCosts.totalCost, 0),
      totalOpenAICost: sessions.reduce((sum, s) => sum + (s.openAICosts?.totalCost || 0), 0),
    };
  }
}

// Export singleton instance
export const costTracker = new CostTracker();