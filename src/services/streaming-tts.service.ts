/**
 * Streaming TTS Service
 * Provides real-time text-to-speech with chunking for natural conversation flow
 */

import { Readable } from 'stream';
import { GeminiTTSService, GeminiVoice } from './gemini-tts.service';
import logger from '../utils/logger';

/**
 * Options for streaming TTS
 */
interface StreamingOptions {
  chunkDelimiter?: RegExp; // Regex to split text into speakable chunks
  maxChunkSize?: number;   // Maximum characters per chunk
  voice?: GeminiVoice;     // Voice to use
}

/**
 * Default chunk delimiter - splits on sentence endings and natural pauses
 */
const DEFAULT_CHUNK_DELIMITER = /[.!?;,]\s+|\n/;

/**
 * Streaming TTS Service
 * Breaks text into smaller chunks and generates audio progressively
 */
export class StreamingTTSService {
  private ttsService: GeminiTTSService;
  private chunkDelimiter: RegExp;
  private maxChunkSize: number;

  constructor(options: StreamingOptions = {}) {
    this.ttsService = new GeminiTTSService(options.voice || GeminiVoice.CALLIRRHOE);
    this.chunkDelimiter = options.chunkDelimiter || DEFAULT_CHUNK_DELIMITER;
    this.maxChunkSize = options.maxChunkSize || 100; // Smaller chunks for faster response
  }

  /**
   * Generate audio for a single text chunk
   * Public method for external use
   */
  async generateAudioForChunk(text: string): Promise<Buffer> {
    return this.ttsService.textToSpeech(text);
  }

  /**
   * Split text into speakable chunks
   * Prioritizes natural speech boundaries
   */
  private splitIntoChunks(text: string): string[] {
    const chunks: string[] = [];
    
    // First, split by delimiter
    const preliminaryChunks = text.split(this.chunkDelimiter);
    
    // Then ensure chunks aren't too large
    for (const chunk of preliminaryChunks) {
      if (chunk.length <= this.maxChunkSize) {
        if (chunk.trim()) chunks.push(chunk.trim());
      } else {
        // Split large chunks by words
        const words = chunk.split(' ');
        let currentChunk = '';
        
        for (const word of words) {
          if ((currentChunk + ' ' + word).length <= this.maxChunkSize) {
            currentChunk += (currentChunk ? ' ' : '') + word;
          } else {
            if (currentChunk.trim()) chunks.push(currentChunk.trim());
            currentChunk = word;
          }
        }
        
        if (currentChunk.trim()) chunks.push(currentChunk.trim());
      }
    }
    
    return chunks;
  }

  /**
   * Generate audio for text chunks progressively
   * Returns array of audio buffers as they're generated
   */
  async *generateAudioChunks(text: string): AsyncGenerator<Buffer, void, unknown> {
    const chunks = this.splitIntoChunks(text);
    
    logger.info('Streaming TTS: Processing text in chunks', {
      totalLength: text.length,
      chunkCount: chunks.length,
      chunks: chunks.map(c => c.substring(0, 20) + '...')
    });

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      try {
        const startTime = Date.now();
        const audioBuffer = await this.ttsService.textToSpeech(chunk);
        const duration = Date.now() - startTime;
        
        logger.info('Streaming TTS: Chunk generated', {
          chunkIndex: i,
          chunkLength: chunk.length,
          audioSize: audioBuffer.length,
          generationTime: duration
        });
        
        yield audioBuffer;
      } catch (error) {
        logger.error('Streaming TTS: Failed to generate chunk', {
          chunkIndex: i,
          chunk,
          error
        });
        // Continue with next chunk instead of failing completely
      }
    }
  }

  /**
   * Create a readable stream of audio data
   * Useful for streaming responses
   */
  createAudioStream(text: string): Readable {
    const generator = this.generateAudioChunks(text);
    
    return Readable.from(generator);
  }

  /**
   * Process text as it comes in (for real-time streaming from LLM)
   * Accumulates text until a chunk boundary is found
   */
  createIncrementalProcessor() {
    let buffer = '';
    const processedChunks = new Set<string>();
    
    return {
      /**
       * Add text incrementally and get any complete chunks
       */
      addText: (text: string): string[] => {
        buffer += text;
        const chunks: string[] = [];
        
        // Check if we have any complete chunks
        const matches = buffer.match(this.chunkDelimiter);
        if (matches) {
          const parts = buffer.split(this.chunkDelimiter);
          
          // All but the last part are complete chunks
          for (let i = 0; i < parts.length - 1; i++) {
            const chunk = parts[i].trim();
            if (chunk && !processedChunks.has(chunk)) {
              chunks.push(chunk);
              processedChunks.add(chunk);
            }
          }
          
          // Keep the last part in buffer
          buffer = parts[parts.length - 1];
        }
        
        // If buffer is getting too large, force a chunk
        if (buffer.length > this.maxChunkSize) {
          const chunk = buffer.trim();
          if (chunk && !processedChunks.has(chunk)) {
            chunks.push(chunk);
            processedChunks.add(chunk);
          }
          buffer = '';
        }
        
        return chunks;
      },
      
      /**
       * Get any remaining text as final chunk
       */
      flush: (): string[] => {
        const chunks: string[] = [];
        if (buffer.trim() && !processedChunks.has(buffer.trim())) {
          chunks.push(buffer.trim());
        }
        buffer = '';
        return chunks;
      }
    };
  }
}

/**
 * Singleton instance for easy access
 */
export const streamingTTS = new StreamingTTSService({
  voice: GeminiVoice.CALLIRRHOE,
  maxChunkSize: 80 // Smaller chunks for faster initial response
});