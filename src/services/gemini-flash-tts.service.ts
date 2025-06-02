/**
 * Gemini Flash TTS Service
 * Tests the new Gemini 2.5 Flash TTS Preview model for improved latency
 */

import { GoogleGenAI } from '@google/genai';
import { config } from '../config';
import logger from '../utils/logger';
import { GeminiVoice } from './gemini-tts.service';

/**
 * Gemini Flash TTS Service
 * Uses the newer Flash model which may have better performance
 */
export class GeminiFlashTTSService {
  private ai: GoogleGenAI;
  private model = 'gemini-2.5-flash-tts-preview'; // New Flash TTS model
  private defaultVoice: GeminiVoice;

  constructor(voice: GeminiVoice = GeminiVoice.CALLIRRHOE) {
    this.ai = new GoogleGenAI({
      apiKey: config.gemini.apiKey,
    });
    this.defaultVoice = voice;
    
    logger.info('Gemini Flash TTS Service initialized', {
      model: this.model,
      defaultVoice: this.defaultVoice
    });
  }

  /**
   * Convert text to speech using Flash model
   */
  async textToSpeech(
    text: string,
    voice?: GeminiVoice,
    options?: {
      speakingRate?: number;
      pitch?: number;
      volumeGainDb?: number;
    }
  ): Promise<Buffer> {
    const selectedVoice = voice || this.defaultVoice;
    const startTime = Date.now();

    try {
      logger.info('Generating speech with Gemini Flash TTS', {
        text: text.substring(0, 50) + '...',
        voice: selectedVoice,
        model: this.model
      });

      const config = {
        temperature: 0.7,
        responseModalities: ['audio'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: selectedVoice
            }
          },
          speakingRate: options?.speakingRate || 1.0,
          pitch: options?.pitch || 0,
          volumeGainDb: options?.volumeGainDb || 0
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

      let audioBuffer: Buffer | null = null;

      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData?.mimeType?.includes('audio') && part.inlineData.data) {
            audioBuffer = Buffer.from(part.inlineData.data, 'base64');
            break;
          }
        }
      }

      if (!audioBuffer) {
        throw new Error('No audio data in response');
      }

      const duration = Date.now() - startTime;
      logger.info('Flash TTS generation completed', {
        duration,
        size: audioBuffer.length,
        voice: selectedVoice,
        model: this.model
      });

      return audioBuffer;
    } catch (error) {
      logger.error('Failed to generate speech with Gemini Flash TTS', { 
        error,
        model: this.model 
      });
      throw error;
    }
  }

  /**
   * Test latency of Flash model
   */
  async measureLatency(testText: string = "Hello, this is a test."): Promise<number> {
    const startTime = Date.now();
    
    try {
      await this.textToSpeech(testText);
      const latency = Date.now() - startTime;
      
      logger.info('Flash TTS latency measurement', {
        latency,
        textLength: testText.length,
        model: this.model
      });
      
      return latency;
    } catch (error) {
      logger.error('Error measuring Flash TTS latency', { error });
      throw error;
    }
  }
}

// Export singleton instance
export const geminiFlashTTSService = new GeminiFlashTTSService();