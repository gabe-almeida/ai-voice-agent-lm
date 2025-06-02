/**
 * WebSocket Server for Real-Time Voice Communication
 * Handles bidirectional streaming for low-latency voice interactions
 */

import { WebSocketServer, WebSocket } from 'ws';
import { Server as HTTPServer } from 'http';
import logger from '../utils/logger';
import { randomUUID as uuidv4 } from 'crypto';

/**
 * Connection state tracking
 */
interface ConnectionInfo {
  id: string;
  ws: WebSocket;
  isAlive: boolean;
  createdAt: Date;
  lastActivity: Date;
  sessionData?: {
    userId?: string;
    conversationId?: string;
  };
}

/**
 * WebSocket message types for type safety
 */
export enum MessageType {
  // Audio messages
  AUDIO_DATA = 'audio_data',
  AUDIO_CHUNK = 'audio_chunk',
  
  // Text messages
  TEXT_MESSAGE = 'text_message',
  TEXT_CHUNK = 'text_chunk',
  
  // Control messages
  START_SESSION = 'start_session',
  END_SESSION = 'end_session',
  HEARTBEAT = 'heartbeat',
  
  // Status messages
  ERROR = 'error',
  STATUS = 'status',
  LATENCY_REPORT = 'latency_report'
}

/**
 * Base message interface
 */
export interface BaseMessage {
  type: MessageType;
  timestamp: number;
  sequenceNumber?: number;
}

/**
 * Specific message types
 */
export interface AudioDataMessage extends BaseMessage {
  type: MessageType.AUDIO_DATA;
  data: string; // Base64 encoded audio
  format: 'wav' | 'pcm' | 'mp3';
  sampleRate?: number;
}

export interface TextMessage extends BaseMessage {
  type: MessageType.TEXT_MESSAGE;
  text: string;
  isFinal?: boolean;
}

export interface ErrorMessage extends BaseMessage {
  type: MessageType.ERROR;
  error: string;
  code?: string;
}

/**
 * WebSocket server class for managing real-time connections
 */
export class VoiceWebSocketServer {
  private wss: WebSocketServer;
  private connections: Map<string, ConnectionInfo> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  private readonly CONNECTION_TIMEOUT = 60000; // 60 seconds

  constructor(server: HTTPServer, path: string = '/ws') {
    // Initialize WebSocket server
    this.wss = new WebSocketServer({
      server,
      path,
      perMessageDeflate: {
        zlibDeflateOptions: {
          chunkSize: 1024,
          memLevel: 7,
          level: 3
        },
        zlibInflateOptions: {
          chunkSize: 10 * 1024
        },
        clientNoContextTakeover: true,
        serverNoContextTakeover: true,
        serverMaxWindowBits: 10,
        concurrencyLimit: 10,
        threshold: 1024
      }
    });

    this.setupEventHandlers();
    this.startHeartbeat();
    
    logger.info('WebSocket server initialized', {
      path,
      heartbeatInterval: this.HEARTBEAT_INTERVAL,
      connectionTimeout: this.CONNECTION_TIMEOUT
    });
  }

  /**
   * Set up WebSocket event handlers
   */
  private setupEventHandlers(): void {
    this.wss.on('connection', (ws: WebSocket, request) => {
      const connectionId = uuidv4();
      const connection: ConnectionInfo = {
        id: connectionId,
        ws,
        isAlive: true,
        createdAt: new Date(),
        lastActivity: new Date()
      };

      // Store connection
      this.connections.set(connectionId, connection);
      
      logger.info('New WebSocket connection established', {
        connectionId,
        totalConnections: this.connections.size,
        clientIp: request.socket.remoteAddress
      });

      // Set up connection-specific handlers
      this.setupConnectionHandlers(connection);

      // Send welcome message
      this.sendMessage(connection, {
        type: MessageType.STATUS,
        timestamp: Date.now(),
        status: 'connected',
        connectionId
      });
    });

    this.wss.on('error', (error) => {
      logger.error('WebSocket server error', { error });
    });
  }

  /**
   * Set up handlers for individual connections
   */
  private setupConnectionHandlers(connection: ConnectionInfo): void {
    const { ws, id } = connection;

    // Handle incoming messages
    ws.on('message', (data: Buffer) => {
      try {
        connection.lastActivity = new Date();
        
        // Parse message
        const message = JSON.parse(data.toString()) as BaseMessage;
        
        logger.debug('Received WebSocket message', {
          connectionId: id,
          type: message.type,
          timestamp: message.timestamp
        });

        // Route message to appropriate handler
        this.handleMessage(connection, message);
      } catch (error) {
        logger.error('Error processing WebSocket message', {
          connectionId: id,
          error
        });
        
        this.sendError(connection, 'Invalid message format');
      }
    });

    // Handle pong responses for heartbeat
    ws.on('pong', () => {
      connection.isAlive = true;
      connection.lastActivity = new Date();
    });

    // Handle connection close
    ws.on('close', (code, reason) => {
      logger.info('WebSocket connection closed', {
        connectionId: id,
        code,
        reason: reason.toString()
      });
      
      this.connections.delete(id);
    });

    // Handle errors
    ws.on('error', (error) => {
      logger.error('WebSocket connection error', {
        connectionId: id,
        error
      });
    });
  }

  /**
   * Handle incoming messages based on type
   */
  private handleMessage(connection: ConnectionInfo, message: BaseMessage): void {
    switch (message.type) {
      case MessageType.HEARTBEAT:
        // Respond to heartbeat
        this.sendMessage(connection, {
          type: MessageType.HEARTBEAT,
          timestamp: Date.now()
        });
        break;

      case MessageType.START_SESSION:
        // Handle session start
        this.handleSessionStart(connection, message);
        break;

      case MessageType.AUDIO_DATA:
        // Handle incoming audio
        this.handleAudioData(connection, message as AudioDataMessage);
        break;

      case MessageType.TEXT_MESSAGE:
        // Handle text message
        this.handleTextMessage(connection, message as TextMessage);
        break;

      default:
        logger.warn('Unknown message type received', {
          connectionId: connection.id,
          type: message.type
        });
    }
  }

  /**
   * Handle session start
   */
  private handleSessionStart(connection: ConnectionInfo, message: any): void {
    connection.sessionData = {
      userId: message.userId,
      conversationId: message.conversationId || uuidv4()
    };

    logger.info('Session started', {
      connectionId: connection.id,
      sessionData: connection.sessionData
    });

    this.sendMessage(connection, {
      type: MessageType.STATUS,
      timestamp: Date.now(),
      status: 'session_started',
      conversationId: connection.sessionData.conversationId
    });
  }

  /**
   * Handle incoming audio data
   */
  private handleAudioData(connection: ConnectionInfo, message: AudioDataMessage): void {
    // This will be implemented when we integrate with Gemini streaming
    logger.debug('Audio data received', {
      connectionId: connection.id,
      format: message.format,
      dataLength: message.data.length
    });
  }

  /**
   * Handle text messages
   */
  private handleTextMessage(connection: ConnectionInfo, message: TextMessage): void {
    // This will be implemented when we integrate with Gemini streaming
    logger.debug('Text message received', {
      connectionId: connection.id,
      text: message.text.substring(0, 50) + '...'
    });
  }

  /**
   * Send message to a specific connection
   */
  public sendMessage(connection: ConnectionInfo, message: any): void {
    if (connection.ws.readyState === WebSocket.OPEN) {
      connection.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Send error message
   */
  private sendError(connection: ConnectionInfo, error: string, code?: string): void {
    const errorMessage: ErrorMessage = {
      type: MessageType.ERROR,
      timestamp: Date.now(),
      error,
      code
    };
    
    this.sendMessage(connection, errorMessage);
  }

  /**
   * Broadcast message to all connections
   */
  public broadcast(message: any): void {
    this.connections.forEach((connection) => {
      this.sendMessage(connection, message);
    });
  }

  /**
   * Start heartbeat interval to check connection health
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      
      this.connections.forEach((connection, id) => {
        if (!connection.isAlive) {
          // Connection failed to respond to last ping
          logger.warn('Terminating inactive connection', { connectionId: id });
          connection.ws.terminate();
          this.connections.delete(id);
          return;
        }

        // Check for timeout
        const lastActivityAge = now - connection.lastActivity.getTime();
        if (lastActivityAge > this.CONNECTION_TIMEOUT) {
          logger.warn('Connection timeout', { 
            connectionId: id,
            lastActivityAge 
          });
          connection.ws.close(1000, 'Connection timeout');
          this.connections.delete(id);
          return;
        }

        // Send ping
        connection.isAlive = false;
        connection.ws.ping();
      });

      logger.debug('Heartbeat check completed', {
        activeConnections: this.connections.size
      });
    }, this.HEARTBEAT_INTERVAL);
  }

  /**
   * Get connection statistics
   */
  public getStats() {
    return {
      totalConnections: this.connections.size,
      connections: Array.from(this.connections.values()).map(conn => ({
        id: conn.id,
        createdAt: conn.createdAt,
        lastActivity: conn.lastActivity,
        isAlive: conn.isAlive,
        hasSession: !!conn.sessionData
      }))
    };
  }

  /**
   * Gracefully shutdown the WebSocket server
   */
  public shutdown(): void {
    logger.info('Shutting down WebSocket server');
    
    // Clear heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Close all connections
    this.connections.forEach((connection) => {
      connection.ws.close(1000, 'Server shutting down');
    });

    // Close server
    this.wss.close();
  }
}

// Export singleton instance
let wsServer: VoiceWebSocketServer | null = null;

export function initializeWebSocketServer(httpServer: HTTPServer): VoiceWebSocketServer {
  if (!wsServer) {
    wsServer = new VoiceWebSocketServer(httpServer);
  }
  return wsServer;
}

export function getWebSocketServer(): VoiceWebSocketServer | null {
  return wsServer;
}