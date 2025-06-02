/**
 * Gemini Streaming Service V2
 * Optimized for real-world Gemini API capabilities
 * Provides low-latency voice responses through intelligent chunking and parallel processing
 */

import { GoogleGenAI } from '@google/genai';
import { config } from '../config';
import logger from '../utils/logger';
import { GeminiVoice, GeminiTTSService } from './gemini-tts.service';

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
  chunkingStrategy?: 'aggressive' | 'balanced' | 'quality';
}

/**
 * Audio chunk with metadata
 */
export interface AudioChunk {
  audio: Buffer;
  text: string;
  index: number;
  timestamp: number;
  duration?: number;
}

/**
 * Text chunk for processing
 */
interface TextChunk {
  text: string;
  index: number;
  isComplete: boolean;
}

/**
 * Gemini Streaming Service V2
 * Achieves low latency through:
 * 1. Streaming text generation
 * 2. Intelligent text chunking
 * 3. Parallel audio generation
 * 4. Progressive audio delivery
 */
export class GeminiStreamingServiceV2 {
  private ai: GoogleGenAI;
  private ttsService: GeminiTTSService;
  private model: string;
  private defaultVoice: GeminiVoice;

  constructor(voice: GeminiVoice = GeminiVoice.CALLIRRHOE) {
    this.ai = new GoogleGenAI({
      apiKey: config.gemini.apiKey,
    });
    this.model = config.gemini.model;
    this.defaultVoice = voice;
    this.ttsService = new GeminiTTSService(voice);
    
    logger.info('Gemini Streaming Service V2 initialized', {
      model: this.model,
      defaultVoice: this.defaultVoice
    });
  }

  /**
   * Generate streaming voice response with minimal latency
   * This is the main method for real-time voice applications
   */
  async *generateVoiceStream(
    prompt: string,
    conversationHistory: Array<{ role: string; content: string }> = [],
    config?: StreamingConfig
  ): AsyncGenerator<AudioChunk, void, unknown> {
    const voice = config?.voice || this.defaultVoice;
    const chunkingStrategy = config?.chunkingStrategy || 'balanced';
    
    logger.info('Starting voice stream generation', {
      promptLength: prompt.length,
      historyLength: conversationHistory.length,
      voice,
      chunkingStrategy
    });

    try {
      // Step 1: Start text generation stream
      const textStream = this.generateTextStream(prompt, conversationHistory, config);
      
      // Step 2: Process text stream into chunks
      const textChunks = this.createTextChunks(textStream, chunkingStrategy);
      
      // Step 3: Generate audio for each chunk in parallel
      let chunkIndex = 0;
      const audioGenerationPromises: Map<number, Promise<Buffer | null>> = new Map();
      
      for await (const textChunk of textChunks) {
        const currentIndex = chunkIndex++;
        
        // Start audio generation immediately (don't wait)
        const audioPromise = this.generateAudioForChunk(textChunk.text, voice);
        audioGenerationPromises.set(currentIndex, audioPromise);
        
        // Check if we have any completed audio chunks to yield
        for (const [index, promise] of audioGenerationPromises) {
          if (index <= currentIndex - 2 || textChunk.isComplete) {
            // Wait for audio generation if it's 2 chunks behind or we're done
            try {
              const audioBuffer = await promise;
              if (audioBuffer) {
                yield {
                  audio: audioBuffer,
                  text: textChunk.text,
                  index,
                  timestamp: Date.now()
                };
              }
              audioGenerationPromises.delete(index);
            } catch (error) {
              logger.error('Error generating audio chunk', { index, error });
              audioGenerationPromises.delete(index);
            }
          }
        }
      }
      
      // Yield any remaining audio chunks
      for (const [index, promise] of audioGenerationPromises) {
        try {
          const audioBuffer = await promise;
          if (audioBuffer) {
            yield {
              audio: audioBuffer,
              text: '', // Text already sent
              index,
              timestamp: Date.now()
            };
          }
        } catch (error) {
          logger.error('Error generating final audio chunk', { index, error });
        }
      }
      
    } catch (error) {
      logger.error('Error in voice stream generation', { error });
      throw error;
    }
  }

  /**
   * Generate text-only streaming response
   */
  private async *generateTextStream(
    prompt: string,
    conversationHistory: Array<{ role: string; content: string }> = [],
    config?: Omit<StreamingConfig, 'voice'>
  ): AsyncGenerator<string, void, unknown> {
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
  }

  /**
   * Create optimized text chunks from streaming text
   */
  private async *createTextChunks(
    textStream: AsyncIterable<string>,
    strategy: 'aggressive' | 'balanced' | 'quality'
  ): AsyncGenerator<TextChunk, void, unknown> {
    let buffer = '';
    let chunkIndex = 0;
    
    // Chunking parameters based on strategy
    const params = this.getChunkingParams(strategy);
    
    for await (const text of textStream) {
      buffer += text;
      
      // Check if we should create a chunk
      while (buffer.length >= params.minSize) {
        const chunkText = this.extractChunk(buffer, params);
        if (chunkText) {
          yield {
            text: chunkText,
            index: chunkIndex++,
            isComplete: false
          };
          buffer = buffer.substring(chunkText.length).trim();
        } else {
          break; // Wait for more text
        }
      }
    }
    
    // Yield any remaining text
    if (buffer.trim()) {
      yield {
        text: buffer.trim(),
        index: chunkIndex,
        isComplete: true
      };
    }
  }

  /**
   * Get chunking parameters based on strategy
   */
  private getChunkingParams(strategy: 'aggressive' | 'balanced' | 'quality') {
    switch (strategy) {
      case 'aggressive':
        return {
          minSize: 15,
          idealSize: 30,
          maxSize: 50,
          preferredBreaks: /[.!?]\s/,
          acceptableBreaks: /[,;:]\s/,
          forceBreak: /\s/
        };
      case 'quality':
        return {
          minSize: 40,
          idealSize: 60,
          maxSize: 100,
          preferredBreaks: /[.!?]\s/,
          acceptableBreaks: /[,;:]\s/,
          forceBreak: /\s/
        };
      case 'balanced':
      default:
        return {
          minSize: 25,
          idealSize: 45,
          maxSize: 70,
          preferredBreaks: /[.!?]\s/,
          acceptableBreaks: /[,;:]\s/,
          forceBreak: /\s/
        };
    }
  }

  /**
   * Extract an optimal chunk from the buffer
   */
  private extractChunk(
    buffer: string,
    params: ReturnType<typeof this.getChunkingParams>
  ): string | null {
    // If buffer is smaller than ideal size, wait for more
    if (buffer.length < params.idealSize) {
      // Unless we're already over min size and found a good break
      const preferredMatch = buffer.match(params.preferredBreaks);
      if (preferredMatch && buffer.length >= params.minSize) {
        return buffer.substring(0, preferredMatch.index! + 1);
      }
      return null;
    }
    
    // Look for preferred break points
    const searchRange = buffer.substring(0, params.maxSize);
    
    // Try sentence endings first
    const sentenceEnd = searchRange.match(params.preferredBreaks);
    if (sentenceEnd) {
      return buffer.substring(0, sentenceEnd.index! + 1);
    }
    
    // Try clause boundaries
    const clauseEnd = searchRange.match(params.acceptableBreaks);
    if (clauseEnd) {
      return buffer.substring(0, clauseEnd.index! + 1);
    }
    
    // Force break at word boundary
    const wordEnd = searchRange.lastIndexOf(' ');
    if (wordEnd > params.minSize) {
      return buffer.substring(0, wordEnd);
    }
    
    // Last resort: break at max size
    return buffer.substring(0, params.maxSize);
  }

  /**
   * Generate audio for a text chunk
   */
  private async generateAudioForChunk(text: string, voice: GeminiVoice): Promise<Buffer | null> {
    try {
      const startTime = Date.now();
      const audioBuffer = await this.ttsService.textToSpeech(text, voice);
      const duration = Date.now() - startTime;
      
      logger.debug('Generated audio chunk', {
        textLength: text.length,
        audioSize: audioBuffer.length,
        duration,
        voice
      });
      
      return audioBuffer;
    } catch (error) {
      logger.error('Failed to generate audio chunk', { text, voice, error });
      return null;
    }
  }

  /**
   * Get optimized configuration for voice applications
   */
  getOptimizedVoiceConfig(): StreamingConfig {
    return {
      temperature: 0.8,
      maxOutputTokens: 100,
      topK: 30,
      topP: 0.9,
      stopSequences: ['\n\n', 'User:', 'Assistant:'],
      chunkingStrategy: 'balanced'
    };
  }

  /**
   * Measure expected latency for different strategies
   */
  async measureLatency(testPrompt: string = "Hello"): Promise<{
    textStreamLatency: number;
    firstAudioLatency: number;
    totalLatency: number;
  }> {
    const startTime = Date.now();
    let textStreamLatency = 0;
    let firstAudioLatency = 0;
    let firstText = false;
    let firstAudio = false;
    
    try {
      for await (const chunk of this.generateVoiceStream(testPrompt)) {
        if (!firstText && chunk.text) {
          textStreamLatency = Date.now() - startTime;
          firstText = true;
        }
        
        if (!firstAudio && chunk.audio) {
          firstAudioLatency = Date.now() - startTime;
          firstAudio = true;
          break; // We have our measurements
        }
      }
      
      const totalLatency = Date.now() - startTime;
      
      return {
        textStreamLatency,
        firstAudioLatency,
        totalLatency
      };
    } catch (error) {
      logger.error('Error measuring latency', { error });
      throw error;
    }
  }
}

// Export singleton instance
export const geminiStreamingServiceV2 = new GeminiStreamingServiceV2();