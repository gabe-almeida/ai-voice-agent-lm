/**
 * Gemini TTS Service
 * Uses Google's Gemini 2.5 Pro TTS Preview for high-quality voice synthesis
 */

import { GoogleGenAI } from '@google/genai';
import { config } from '../config';
import logger from '../utils/logger';
import { geminiTTSRateLimiter } from '../utils/rate-limiter';

/**
 * Available voice names for Gemini TTS
 */
export enum GeminiVoice {
  ZEPHYR = 'Zephyr',
  PUCK = 'Puck',
  CHARON = 'Charon',
  KORE = 'Kore',
  FENRIR = 'Fenrir',
  AOEDE = 'Aoede',
  CALLIRRHOE = 'Callirrhoe',
}

/**
 * WAV conversion options interface
 */
interface WavConversionOptions {
  numChannels: number;
  sampleRate: number;
  bitsPerSample: number;
}

/**
 * Gemini TTS Service class
 */
export class GeminiTTSService {
  private ai: GoogleGenAI;
  private model = 'gemini-2.5-pro-preview-tts';
  private defaultVoice: GeminiVoice;

  constructor(voice: GeminiVoice = GeminiVoice.ZEPHYR) {
    this.ai = new GoogleGenAI({
      apiKey: config.gemini.apiKey,
    });
    this.defaultVoice = voice;
  }

  /**
   * Convert text to speech and return audio buffer
   */
  async textToSpeech(text: string, voice?: GeminiVoice): Promise<Buffer> {
    try {
      // Apply rate limiting
      await geminiTTSRateLimiter.waitForToken();
      
      const selectedVoice = voice || this.defaultVoice;
      
      logger.info('Generating speech with Gemini TTS', {
        text: text.substring(0, 50) + '...',
        voice: selectedVoice,
        tokensRemaining: geminiTTSRateLimiter.getTokenCount(),
      });

      const config = {
        temperature: 0.7, // Lower temperature for more consistent speech
        responseModalities: ['audio'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: selectedVoice,
            },
          },
        },
      };

      const contents = [
        {
          role: 'user',
          parts: [
            {
              text: text,
            },
          ],
        },
      ];

      const response = await this.ai.models.generateContentStream({
        model: this.model,
        config,
        contents,
      });

      let audioBuffer: Buffer | null = null;

      for await (const chunk of response) {
        if (!chunk.candidates || !chunk.candidates[0].content || !chunk.candidates[0].content.parts) {
          continue;
        }
        
        if (chunk.candidates?.[0]?.content?.parts?.[0]?.inlineData) {
          const inlineData = chunk.candidates[0].content.parts[0].inlineData;
          let buffer = Buffer.from(inlineData.data || '', 'base64');
          
          // Convert to WAV if necessary
          if (!inlineData.mimeType?.includes('wav')) {
            buffer = this.convertToWav(inlineData.data || '', inlineData.mimeType || '');
          }
          
          audioBuffer = buffer;
          break; // We only need the first audio chunk
        }
      }

      if (!audioBuffer) {
        throw new Error('No audio data received from Gemini TTS');
      }

      logger.info('Successfully generated speech', { 
        size: audioBuffer.length,
        voice: selectedVoice 
      });

      return audioBuffer;
    } catch (error) {
      logger.error('Failed to generate speech with Gemini TTS', { error });
      throw error;
    }
  }

  /**
   * Convert raw audio data to WAV format
   */
  private convertToWav(rawData: string, mimeType: string): Buffer {
    const options = this.parseMimeType(mimeType);
    const buffer = Buffer.from(rawData, 'base64');
    const wavHeader = this.createWavHeader(buffer.length, options);
    
    return Buffer.concat([wavHeader, buffer]);
  }

  /**
   * Parse MIME type to extract audio format options
   */
  private parseMimeType(mimeType: string): WavConversionOptions {
    const [fileType, ...params] = mimeType.split(';').map(s => s.trim());
    const [_, format] = fileType.split('/');

    const options: Partial<WavConversionOptions> = {
      numChannels: 1,
    };

    if (format && format.startsWith('L')) {
      const bits = parseInt(format.slice(1), 10);
      if (!isNaN(bits)) {
        options.bitsPerSample = bits;
      }
    }

    for (const param of params) {
      const [key, value] = param.split('=').map(s => s.trim());
      if (key === 'rate') {
        options.sampleRate = parseInt(value, 10);
      }
    }

    // Default values if not specified
    return {
      numChannels: options.numChannels || 1,
      sampleRate: options.sampleRate || 24000,
      bitsPerSample: options.bitsPerSample || 16,
    };
  }

  /**
   * Create WAV file header
   */
  private createWavHeader(dataLength: number, options: WavConversionOptions): Buffer {
    const { numChannels, sampleRate, bitsPerSample } = options;

    // http://soundfile.sapp.org/doc/WaveFormat
    const byteRate = sampleRate * numChannels * bitsPerSample / 8;
    const blockAlign = numChannels * bitsPerSample / 8;
    const buffer = Buffer.alloc(44);

    buffer.write('RIFF', 0);                      // ChunkID
    buffer.writeUInt32LE(36 + dataLength, 4);     // ChunkSize
    buffer.write('WAVE', 8);                      // Format
    buffer.write('fmt ', 12);                     // Subchunk1ID
    buffer.writeUInt32LE(16, 16);                 // Subchunk1Size (PCM)
    buffer.writeUInt16LE(1, 20);                  // AudioFormat (1 = PCM)
    buffer.writeUInt16LE(numChannels, 22);        // NumChannels
    buffer.writeUInt32LE(sampleRate, 24);         // SampleRate
    buffer.writeUInt32LE(byteRate, 28);           // ByteRate
    buffer.writeUInt16LE(blockAlign, 32);         // BlockAlign
    buffer.writeUInt16LE(bitsPerSample, 34);      // BitsPerSample
    buffer.write('data', 36);                     // Subchunk2ID
    buffer.writeUInt32LE(dataLength, 40);         // Subchunk2Size

    return buffer;
  }

  /**
   * Get list of available voices
   */
  static getAvailableVoices(): string[] {
    return Object.values(GeminiVoice);
  }
}

/**
 * Create a singleton instance for simple use cases
 */
export const geminiTTSService = new GeminiTTSService();