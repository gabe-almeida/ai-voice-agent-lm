/**
 * Gemini AI Service
 * Handles interactions with Google's Gemini 2.0 Flash model
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config';
import logger from '../utils/logger';
import { geminiChatRateLimiter } from '../utils/rate-limiter';
import { EMMA_SYSTEM_PROMPT } from '../config/emma-prompt';

/**
 * Initialize Gemini AI client
 */
const genAI = new GoogleGenerativeAI(config.gemini.apiKey);

/**
 * Default system instructions for the voice agent
 * Using Emma - Luxury Makeover Consultation Scheduling Agent
 */
const DEFAULT_INSTRUCTIONS = EMMA_SYSTEM_PROMPT;

/**
 * Interface for conversation context
 */
interface ConversationContext {
  sessionId: string;
  history: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}

/**
 * Gemini Service class for handling AI interactions
 */
export class GeminiService {
  private model;
  private conversations: Map<string, ConversationContext> = new Map();
  private instructions: string;

  constructor(instructions?: string) {
    this.instructions = instructions || DEFAULT_INSTRUCTIONS;
    this.model = genAI.getGenerativeModel({ 
      model: config.gemini.model,
      systemInstruction: this.instructions
    });
  }

  /**
   * Start a new conversation
   */
  startConversation(sessionId: string): void {
    this.conversations.set(sessionId, {
      sessionId,
      history: []
    });
    logger.info('Started new Gemini conversation', { sessionId });
  }

  /**
   * End a conversation
   */
  endConversation(sessionId: string): void {
    this.conversations.delete(sessionId);
    logger.info('Ended Gemini conversation', { sessionId });
  }

  /**
   * Generate a response from Gemini
   */
  async generateResponse(
    sessionId: string,
    userInput: string,
    context?: string
  ): Promise<string> {
    try {
      // Apply rate limiting
      await geminiChatRateLimiter.waitForToken();

      // Get or create conversation
      let conversation = this.conversations.get(sessionId);
      if (!conversation) {
        this.startConversation(sessionId);
        conversation = this.conversations.get(sessionId)!;
      }

      // Add user message to history
      conversation.history.push({
        role: 'user',
        content: userInput
      });

      // Build conversation history for the chat
      const chatHistory = conversation.history.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }));

      // Start a chat session with history
      const chat = this.model.startChat({
        history: chatHistory,
      });

      // Build the message with context if provided
      const message = context
        ? `Context: ${context}\n\nUser: ${userInput}`
        : userInput;

      // Send message and get response
      const result = await chat.sendMessage(message);
      const text = result.response.text();

      // Add assistant response to history
      conversation.history.push({
        role: 'assistant',
        content: text
      });

      // Keep only last 10 exchanges to prevent context from growing too large
      if (conversation.history.length > 20) {
        conversation.history = conversation.history.slice(-20);
      }

      logger.info('Generated Gemini response', {
        sessionId,
        inputLength: userInput.length,
        outputLength: text.length
      });

      return text;
    } catch (error) {
      logger.error('Error generating Gemini response', {
        error: error instanceof Error ? error.message : 'Unknown error',
        sessionId
      });
      throw error;
    }
  }

  /**
   * Get conversation history
   */
  getConversationHistory(sessionId: string): Array<{role: 'user' | 'assistant'; content: string}> {
    const conversation = this.conversations.get(sessionId);
    return conversation ? conversation.history : [];
  }

  /**
   * Clear all conversations (for cleanup)
   */
  clearAllConversations(): void {
    this.conversations.clear();
    logger.info('Cleared all Gemini conversations');
  }

  /**
   * Update system instructions
   */
  updateInstructions(instructions: string): void {
    this.instructions = instructions;
    this.model = genAI.getGenerativeModel({ 
      model: config.gemini.model,
      systemInstruction: this.instructions
    });
    logger.info('Updated Gemini system instructions');
  }

  /**
   * Get current instructions
   */
  getInstructions(): string {
    return this.instructions;
  }

  /**
   * Legacy method for backward compatibility
   * @deprecated Use generateResponse instead
   */
  async sendMessage(message: string, sessionId: string = 'default'): Promise<string> {
    return this.generateResponse(sessionId, message);
  }
}

// Export a default instance with session management
class GeminiServiceWithSession extends GeminiService {
  private defaultSessionId = 'default';

  setSessionId(sessionId: string): void {
    this.defaultSessionId = sessionId;
  }

  async sendMessage(message: string): Promise<string> {
    return this.generateResponse(this.defaultSessionId, message);
  }

  endConversation(): void {
    super.endConversation(this.defaultSessionId);
  }
}

export const geminiService = new GeminiServiceWithSession();