/**
 * Gemini Streaming Service
 * Provides real-time streaming capabilities for text and audio generation
 * Uses Gemini 2.5 Pro's multimodal streaming features
 */

import { GoogleGenAI } from '@google/genai';
import { config } from '../config';
import logger from '../utils/logger';
import { GeminiVoice } from './gemini-tts.service';

/**
 * Streaming configuration for real-time voice
 */
interface StreamingConfig {
  voice?: GeminiVoice;
  temperature?: number;
  maxOutputTokens?: number;
  topK?: number;
  topP?: number;
  stopSequences?: string[];
}

/**
 * Chunk types for streaming responses
 */
export interface StreamChunk {
  text?: string;
  audio?: Buffer;
  isFinal?: boolean;
  timestamp: number;
}

/**
 * Gemini Streaming Service
 * Handles real-time text and audio generation with minimal latency
 */
export class GeminiStreamingService {
  private ai: GoogleGenAI;
  private model: string;
  private defaultVoice: GeminiVoice;

  constructor(voice: GeminiVoice = GeminiVoice.CALLIRRHOE) {
    this.ai = new GoogleGenAI({
      apiKey: config.gemini.apiKey,
    });
    this.model = config.gemini.model;
    this.defaultVoice = voice;
    
    logger.info('Gemini Streaming Service initialized', {
      model: this.model,
      defaultVoice: this.defaultVoice
    });
  }

  /**
   * Generate streaming response with both text and audio
   * This is the key method for achieving low latency
   */
  async *generateMultimodalStream(
    prompt: string,
    conversationHistory: Array<{ role: string; content: string }> = [],
    config?: StreamingConfig
  ): AsyncGenerator<StreamChunk, void, unknown> {
    try {
      const voice = config?.voice || this.defaultVoice;
      
      logger.info('Starting multimodal stream generation', {
        promptLength: prompt.length,
        historyLength: conversationHistory.length,
        voice
      });

      // Configure generation with both text and audio output
      const generationConfig = {
        temperature: config?.temperature || 0.7,
        maxOutputTokens: config?.maxOutputTokens || 150,
        topK: config?.topK || 40,
        topP: config?.topP || 0.95,
        stopSequences: config?.stopSequences || [],
        // Request both modalities for simultaneous generation
        responseModalities: ['text', 'audio'],
        // Configure speech output
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: voice
            }
          }
        }
      };

      // Build conversation context
      const contents = [
        ...conversationHistory.map(msg => ({
          role: msg.role,
          parts: [{ text: msg.content }]
        })),
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ];

      // Start streaming generation
      const response = await this.ai.models.generateContentStream({
        model: this.model,
        config: generationConfig,
        contents,
      });
      
      let textBuffer = '';
      let chunkCount = 0;
      
      // Process streaming chunks
      for await (const chunk of response) {
        chunkCount++;
        const timestamp = Date.now();
        
        // Extract text if available
        let chunkText = '';
        if (chunk.candidates?.[0]?.content?.parts) {
          for (const part of chunk.candidates[0].content.parts) {
            if (part.text) {
              chunkText += part.text;
              textBuffer += part.text;
            }
          }
        }
        
        // Extract audio if available
        let audioBuffer: Buffer | undefined;
        if (chunk.candidates?.[0]?.content?.parts) {
          for (const part of chunk.candidates[0].content.parts) {
            if (part.inlineData?.mimeType?.includes('audio') && part.inlineData.data) {
              audioBuffer = Buffer.from(part.inlineData.data, 'base64');
              
              logger.debug('Audio chunk received', {
                chunkNumber: chunkCount,
                audioSize: audioBuffer.length,
                mimeType: part.inlineData.mimeType
              });
            }
          }
        }
        
        // Yield chunk if we have content
        if (chunkText || audioBuffer) {
          yield {
            text: chunkText || undefined,
            audio: audioBuffer,
            isFinal: false,
            timestamp
          };
        }
      }
      
      // Final chunk to indicate completion
      yield {
        text: undefined,
        audio: undefined,
        isFinal: true,
        timestamp: Date.now()
      };
      
      logger.info('Multimodal stream generation completed', {
        totalChunks: chunkCount,
        totalTextLength: textBuffer.length
      });
      
    } catch (error) {
      logger.error('Error in multimodal stream generation', { error });
      throw error;
    }
  }

  /**
   * Generate text-only streaming response (faster for text-only needs)
   */
  async *generateTextStream(
    prompt: string,
    conversationHistory: Array<{ role: string; content: string }> = [],
    config?: Omit<StreamingConfig, 'voice'>
  ): AsyncGenerator<string, void, unknown> {
    try {
      logger.info('Starting text stream generation', {
        promptLength: prompt.length,
        historyLength: conversationHistory.length
      });

      const generationConfig = {
        temperature: config?.temperature || 0.7,
        maxOutputTokens: config?.maxOutputTokens || 150,
        topK: config?.topK || 40,
        topP: config?.topP || 0.95,
        stopSequences: config?.stopSequences || []
      };

      const contents = [
        ...conversationHistory.map(msg => ({
          role: msg.role,
          parts: [{ text: msg.content }]
        })),
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ];

      const response = await this.ai.models.generateContentStream({
        model: this.model,
        config: generationConfig,
        contents,
      });
      
      for await (const chunk of response) {
        if (chunk.candidates?.[0]?.content?.parts) {
          for (const part of chunk.candidates[0].content.parts) {
            if (part.text) {
              yield part.text;
            }
          }
        }
      }
      
    } catch (error) {
      logger.error('Error in text stream generation', { error });
      throw error;
    }
  }

  /**
   * Generate audio stream from text chunks
   * Used when we need to convert streaming text to audio
   */
  async *textToAudioStream(
    textStream: AsyncIterable<string>,
    voice?: GeminiVoice
  ): AsyncGenerator<Buffer, void, unknown> {
    try {
      const selectedVoice = voice || this.defaultVoice;
      
      logger.info('Starting text-to-audio stream conversion', { voice: selectedVoice });
      
      // Buffer text until we have enough for natural speech
      let textBuffer = '';
      const minChunkSize = 30; // Minimum characters for audio generation
      const maxChunkSize = 80; // Maximum to keep latency low
      
      for await (const textChunk of textStream) {
        textBuffer += textChunk;
        
        // Check if we should generate audio
        while (textBuffer.length >= minChunkSize) {
          // Find a good breaking point
          let breakPoint = -1;
          
          // Try to break on sentence endings
          const sentenceEnd = textBuffer.search(/[.!?]\s/);
          if (sentenceEnd > 0 && sentenceEnd <= maxChunkSize) {
            breakPoint = sentenceEnd + 1;
          }
          // Try to break on clause boundaries
          else if (textBuffer.length >= maxChunkSize) {
            const clauseEnd = textBuffer.substring(0, maxChunkSize).search(/[,;:]\s/);
            if (clauseEnd > 0) {
              breakPoint = clauseEnd + 1;
            } else {
              // Force break at word boundary
              const wordEnd = textBuffer.substring(0, maxChunkSize).lastIndexOf(' ');
              breakPoint = wordEnd > 0 ? wordEnd : maxChunkSize;
            }
          }
          
          if (breakPoint > 0) {
            const chunk = textBuffer.substring(0, breakPoint).trim();
            textBuffer = textBuffer.substring(breakPoint).trim();
            
            // Generate audio for this chunk
            const audioBuffer = await this.generateAudioChunk(chunk, selectedVoice);
            if (audioBuffer) {
              yield audioBuffer;
            }
          } else {
            break; // Wait for more text
          }
        }
      }
      
      // Process any remaining text
      if (textBuffer.trim()) {
        const audioBuffer = await this.generateAudioChunk(textBuffer.trim(), selectedVoice);
        if (audioBuffer) {
          yield audioBuffer;
        }
      }
      
    } catch (error) {
      logger.error('Error in text-to-audio stream conversion', { error });
      throw error;
    }
  }

  /**
   * Generate audio for a single text chunk
   */
  private async generateAudioChunk(text: string, voice: GeminiVoice): Promise<Buffer | null> {
    try {
      const config = {
        temperature: 0.7,
        responseModalities: ['audio'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: voice
            }
          }
        }
      };

      const contents = [{
        role: 'user',
        parts: [{ text }]
      }];

      const response = await this.ai.models.generateContent({
        model: this.model,
        config,
        contents,
      });
      
      // Extract audio from response
      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData?.mimeType?.includes('audio') && part.inlineData.data) {
            return Buffer.from(part.inlineData.data, 'base64');
          }
        }
      }
      
      return null;
    } catch (error) {
      logger.error('Error generating audio chunk', { text, voice, error });
      return null;
    }
  }

  /**
   * Optimize streaming parameters for voice applications
   */
  getOptimizedVoiceConfig(): StreamingConfig {
    return {
      temperature: 0.8, // Slightly higher for more natural responses
      maxOutputTokens: 100, // Shorter responses for quicker turnaround
      topK: 30, // More focused responses
      topP: 0.9, // Balanced creativity
      stopSequences: ['\n\n', 'User:', 'Assistant:'] // Prevent runaway generation
    };
  }
}

// Export singleton instance
export const geminiStreamingService = new GeminiStreamingService();