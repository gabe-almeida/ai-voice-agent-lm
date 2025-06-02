/**
 * OpenAI Realtime API Service
 * Provides low-latency voice streaming with 300-800ms response time
 */

import { WebSocket } from 'ws';
import { EventEmitter } from 'events';
import logger from '../utils/logger';

interface RealtimeConfig {
  model?: string;
  voice?: string;
  instructions?: string;
  temperature?: number;
  maxResponseLength?: number;
  tools?: ToolDefinition[]; // Added for tool definitions
}

// Define the structure for a tool
export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters: object; // JSON Schema object
  };
}

export class OpenAIRealtimeService extends EventEmitter {
  private ws: WebSocket | null = null;
  private apiKey: string;
  private config: RealtimeConfig;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;

  constructor(apiKey: string, config: RealtimeConfig = {}) {
    super();
    this.apiKey = apiKey;
    this.config = {
      model: 'gpt-4o-realtime-preview-2024-12-17',
      voice: 'alloy',
      temperature: 0.8,
      maxResponseLength: 4096,
      tools: [], // Default to empty array
      ...config
    };
  }

  /**
   * Connect to OpenAI Realtime API via WebSocket
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const url = `wss://api.openai.com/v1/realtime?model=${this.config.model}`;
        const headers = {
          'Authorization': `Bearer ${this.apiKey}`,
          'OpenAI-Beta': 'realtime=v1'
        };

        logger.info('Connecting to OpenAI Realtime API', {
          service: 'openai-realtime',
          model: this.config.model
        });

        this.ws = new WebSocket(url, { headers });

        this.ws.on('open', () => {
          logger.info('Connected to OpenAI Realtime API', {
            service: 'openai-realtime'
          });
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.setupSession();
          resolve();
        });

        this.ws.on('message', (data: Buffer) => {
          this.handleMessage(data);
        });

        this.ws.on('error', (error) => {
          logger.error('WebSocket error', {
            service: 'openai-realtime',
            error: error.message
          });
          this.emit('error', error);
          if (!this.isConnected) {
            reject(error);
          }
        });

        this.ws.on('close', (code, reason) => {
          logger.info('WebSocket closed', {
            service: 'openai-realtime',
            code,
            reason: reason.toString()
          });
          this.isConnected = false;
          this.emit('close', code, reason);
          this.attemptReconnect();
        });

      } catch (error) {
        logger.error('Failed to connect to OpenAI Realtime API', {
          service: 'openai-realtime',
          error
        });
        reject(error);
      }
    });
  }

  /**
   * Setup session configuration
   */
  private setupSession(): void {
    if (!this.ws || !this.isConnected) return;

    // Wait a bit to ensure the session is created before updating
    setTimeout(() => {
      const sessionConfig = {
        type: 'session.update',
        session: {
          modalities: ['text', 'audio'],
          instructions: this.config.instructions || 'You are a helpful AI assistant.',
          voice: this.config.voice,
          input_audio_format: 'pcm16',
          output_audio_format: 'pcm16',
          input_audio_transcription: {
            model: 'whisper-1'
          },
          turn_detection: {
            type: 'server_vad',
            threshold: 0.5,
            prefix_padding_ms: 300,
            silence_duration_ms: 500,
            create_response: true
          },
          tools: this.config.tools || [], // Use configured tools
          temperature: this.config.temperature,
          max_response_output_tokens: this.config.maxResponseLength
        }
      };

      this.send(sessionConfig);
      logger.info('Session update sent', {
        service: 'openai-realtime',
        instructionsLength: this.config.instructions?.length,
        voice: this.config.voice
      });
    }, 100);
  }

  /**
   * Send audio input to the API
   */
  sendAudio(audioData: ArrayBuffer): void {
    if (!this.isConnected) {
      logger.warn('Cannot send audio - not connected', {
        service: 'openai-realtime'
      });
      return;
    }

    const base64Audio = Buffer.from(audioData).toString('base64');
    
    this.send({
      type: 'input_audio_buffer.append',
      audio: base64Audio
    });
  }

  /**
   * Send text input to the API
   */
  sendText(text: string): void {
    if (!this.isConnected) {
      logger.warn('Cannot send text - not connected', {
        service: 'openai-realtime'
      });
      return;
    }

    // Create conversation item
    this.send({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{
          type: 'input_text',
          text: text
        }]
      }
    });

    // Trigger response
    this.send({
      type: 'response.create'
    });
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(data: Buffer): void {
    try {
      const message = JSON.parse(data.toString());
      
      switch (message.type) {
        case 'session.created':
          logger.info('Session created', {
            service: 'openai-realtime',
            session: message.session
          });
          this.emit('session.created', message.session);
          break;

        case 'response.audio.delta':
          // Audio chunk received
          logger.debug('Audio delta received', {
            service: 'openai-realtime',
            deltaLength: message.delta?.length
          });
          const audioData = Buffer.from(message.delta, 'base64');
          this.emit('audio', {
            audio: audioData,
            isFinal: false
          });
          break;

        case 'response.audio.done':
          // Audio generation complete
          logger.info('Audio response complete', {
            service: 'openai-realtime'
          });
          this.emit('audio', {
            audio: new ArrayBuffer(0),
            isFinal: true
          });
          break;

        case 'response.text.delta':
          // Text chunk received
          logger.debug('Text delta received', {
            service: 'openai-realtime',
            delta: message.delta
          });
          this.emit('text', {
            text: message.delta,
            isFinal: false
          });
          break;

        case 'response.text.done':
          // Text generation complete
          logger.info('Text response complete', {
            service: 'openai-realtime',
            text: message.text
          });
          this.emit('text', {
            text: message.text,
            isFinal: true
          });
          break;

        case 'conversation.item.input_audio_transcription.completed':
          // User speech transcribed
          this.emit('transcription', message.transcript);
          break;

        case 'error':
          logger.error('API error', {
            service: 'openai-realtime',
            error: message.error
          });
          this.emit('error', new Error(message.error.message));
          break;

        case 'response.done':
          // Complete response received
          logger.info('Response complete', {
            service: 'openai-realtime',
            response: message.response
          });
          this.emit('response.done', message.response);
          break;

        case 'response.created':
          logger.info('Response created', {
            service: 'openai-realtime'
          });
          break;
        
        case 'tool_calls.requested':
          logger.info('Tool calls requested by OpenAI', {
            service: 'openai-realtime',
            toolCalls: message.tool_calls
          });
          this.emit('tool_calls.requested', message.tool_calls);
          break;

        default:
          logger.debug('Received message', {
            service: 'openai-realtime',
            type: message.type
          });
      }
    } catch (error) {
      logger.error('Failed to parse message', {
        service: 'openai-realtime',
        error
      });
    }
  }

  /**
   * Send a message to the WebSocket
   */
  send(data: any): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      logger.warn('WebSocket not ready', {
        service: 'openai-realtime',
        readyState: this.ws?.readyState
      });
      return;
    }

    const message = JSON.stringify(data);
    this.ws.send(message);
    
    logger.debug('Message sent to OpenAI', {
      service: 'openai-realtime',
      type: data.type,
      messageLength: message.length
    });
  }

  /**
   * Attempt to reconnect after disconnection
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('Max reconnection attempts reached', {
        service: 'openai-realtime',
        attempts: this.reconnectAttempts
      });
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    logger.info('Attempting reconnection', {
      service: 'openai-realtime',
      attempt: this.reconnectAttempts,
      delay
    });

    setTimeout(() => {
      this.connect().catch(error => {
        logger.error('Reconnection failed', {
          service: 'openai-realtime',
          error
        });
      });
    }, delay);
  }

  /**
   * Send tool call results back to OpenAI
   */
  sendToolResults(toolCallId: string, result: any, isError: boolean = false): void {
    if (!this.isConnected) {
      logger.warn('Cannot send tool results - not connected', {
        service: 'openai-realtime'
      });
      return;
    }

    const toolResponseMessage = {
      type: 'tool_calls.update',
      tool_call_id: toolCallId,
      result: isError ? { error: result } : result,
    };
    this.send(toolResponseMessage);
    logger.info('Sent tool results to OpenAI', {
      service: 'openai-realtime',
      toolCallId,
      result: isError ? `Error: ${result}` : 'Success'
    });
  }

  /**
   * Disconnect from the API
   */
  disconnect(): void {
    if (this.ws) {
      this.isConnected = false;
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Check if connected
   */
  get connected(): boolean {
    return this.isConnected;
  }
}

// Helper function to convert audio formats
export function convertAudioFormat(
  audioData: ArrayBuffer,
  fromFormat: 'pcm16' | 'pcm24' | 'float32',
  toFormat: 'pcm16' | 'pcm24' | 'float32'
): ArrayBuffer {
  // Implementation depends on specific format conversion needs
  // For now, return as-is if formats match
  if (fromFormat === toFormat) {
    return audioData;
  }

  // Add conversion logic here based on your needs
  logger.warn('Audio format conversion not implemented', {
    service: 'openai-realtime',
    fromFormat,
    toFormat
  });

  return audioData;
}